import type { FormTask, Task, UpdateTask } from '@jewellery-catalogue/types';

import type { IdGenerator } from '../IdGenerator';
import type { TaskRepository } from '../TaskRepository';

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

        const now = new Date();
        const task: Task = {
            id: this.idGenerator.generate(),
            userId,
            title: taskData.title,
            subject: taskData.subject,
            importance: taskData.importance,
            recurrence: taskData.recurrence,
            status: 'todo',
            dueDate: taskData.dueDate,
            goalId: taskData.goalId,
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

        const existing = await this.taskRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Task not found'), { status: 404 });
        }

        const updated: Task = { ...existing, ...updates, updatedAt: new Date() };

        await this.taskRepo.update(id, updated);

        if (existing.status !== 'done' && updated.status === 'done' && updated.recurrence !== 'none') {
            await this.taskRepo.insert(this.buildNextOccurrence(updated));
        }

        return updated;
    }

    private buildNextOccurrence(completed: Task): Task {
        const offsetDays = completed.recurrence === 'daily' ? 1 : 7;
        const baseDate = completed.dueDate ?? new Date();
        const nextDueDate = new Date(baseDate);
        nextDueDate.setDate(nextDueDate.getDate() + offsetDays);

        const now = new Date();
        return {
            ...completed,
            id: this.idGenerator.generate(),
            status: 'todo',
            dueDate: nextDueDate,
            createdAt: now,
            updatedAt: now,
        };
    }

    async deleteTask(id: string, userId: string): Promise<void> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.taskRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Task not found'), { status: 404 });
        }

        await this.taskRepo.delete(id);
    }
}
