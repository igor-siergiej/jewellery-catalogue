import {
    type FormTask,
    formTaskSchema,
    type Task,
    type UpdateTask,
    updateTaskSchema,
} from '@jewellery-catalogue/types';

import type { IdGenerator } from '../IdGenerator';
import type { TaskRepository } from '../TaskRepository';

const COMPLETED_TASK_RETENTION_DAYS = 30;

export class TaskService {
    constructor(
        private readonly taskRepo: TaskRepository,
        private readonly idGenerator: IdGenerator
    ) {}

    async getTasksByUserId(userId: string): Promise<Array<Task>> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }
        return this.taskRepo.getByUserId(userId);
    }

    async addTask(taskData: FormTask, userId: string): Promise<Task> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const result = formTaskSchema.safeParse(taskData);
        if (!result.success) {
            throw Object.assign(new Error('Invalid task data'), { status: 400 });
        }

        const now = new Date();
        const task: Task = {
            id: this.idGenerator.generate(),
            userId,
            title: result.data.title,
            subject: result.data.subject,
            importance: result.data.importance,
            recurrence: result.data.recurrence,
            status: 'todo',
            dueDate: result.data.dueDate,
            goalId: result.data.goalId,
            favourite: false,
            description: result.data.description,
            checklist: result.data.checklist,
            createdAt: now,
            updatedAt: now,
        };

        await this.taskRepo.insert(task);

        return task;
    }

    async updateTask(id: string, updates: UpdateTask, userId: string): Promise<Task> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const result = updateTaskSchema.safeParse(updates);
        if (!result.success) {
            throw Object.assign(new Error('Invalid task data'), { status: 400 });
        }

        const existing = await this.getOwnedTask(id, userId);

        const now = new Date();
        const updated: Task = { ...existing, ...result.data, updatedAt: now };
        if (updated.status !== 'done') {
            delete updated.completedAt;
        } else if (existing.status !== 'done') {
            updated.completedAt = now;
        } else {
            // Edits to a done task must not restart its retention clock. Legacy done tasks have no
            // completedAt, so their last update before this edit is the best available completion time.
            updated.completedAt = existing.completedAt ?? existing.updatedAt;
        }

        await this.taskRepo.update(id, updated);

        if (existing.status !== 'done' && updated.status === 'done' && updated.recurrence !== 'none') {
            await this.taskRepo.insert(this.buildNextOccurrence(updated));
        }

        return updated;
    }

    private buildNextOccurrence({ completedAt: _completedAt, ...completed }: Task): Task {
        const offsetDays = completed.recurrence === 'daily' ? 1 : 7;
        const baseDate = completed.dueDate ?? new Date();
        const nextDueDate = new Date(baseDate);
        nextDueDate.setDate(nextDueDate.getDate() + offsetDays);

        const now = new Date();
        return {
            ...completed,
            id: this.idGenerator.generate(),
            status: 'todo',
            checklist: completed.checklist?.map((item) => ({ ...item, done: false })),
            dueDate: nextDueDate,
            createdAt: now,
            updatedAt: now,
        };
    }

    private async getOwnedTask(id: string, userId: string): Promise<Task> {
        const task = await this.taskRepo.getByIdAndUserId(id, userId);

        if (!task) {
            throw Object.assign(new Error('Task not found'), { status: 404 });
        }

        return task;
    }

    async deleteTask(id: string, userId: string): Promise<void> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        await this.getOwnedTask(id, userId);

        await this.taskRepo.delete(id);
    }

    // fallow-ignore-next-line unused-class-member
    async purgeCompletedTasks(now: Date = new Date()): Promise<number> {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - COMPLETED_TASK_RETENTION_DAYS);
        return this.taskRepo.deleteCompletedBefore(cutoff);
    }
}
