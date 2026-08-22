import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { FormTask, Task } from '@jewellery-catalogue/types';

import type { IdGenerator } from '../IdGenerator';
import type { TaskRepository } from '../TaskRepository';
import { TaskService } from './index';

const mockTaskRepo: TaskRepository = {
    getById: mock(),
    getByIdAndUserId: mock(),
    getByUserId: mock(),
    getAll: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
};

const mockIdGenerator: IdGenerator = { generate: mock() };

const formTask: FormTask = {
    title: 'Add 50 more listings',
    subject: 'product',
    importance: 'high',
    recurrence: 'none',
    dueDate: new Date('2026-09-01T00:00:00.000Z'),
};

describe('TaskService', () => {
    let service: TaskService;

    beforeEach(() => {
        mock.restore();
        // Reset each mock to clear any residual state
        (mockTaskRepo.getById as ReturnType<typeof mock>).mockClear?.();
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockClear?.();
        (mockTaskRepo.getByUserId as ReturnType<typeof mock>).mockClear?.();
        (mockTaskRepo.getAll as ReturnType<typeof mock>).mockClear?.();
        (mockTaskRepo.insert as ReturnType<typeof mock>).mockClear?.();
        (mockTaskRepo.update as ReturnType<typeof mock>).mockClear?.();
        (mockTaskRepo.delete as ReturnType<typeof mock>).mockClear?.();
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockClear?.();
        service = new TaskService(mockTaskRepo, mockIdGenerator);
    });

    it('addTask throws 400 when userId is missing', async () => {
        await expect(service.addTask(formTask, '')).rejects.toMatchObject({ status: 400 });
    });

    it('addTask throws 400 when task data is invalid', async () => {
        await expect(service.addTask({ ...formTask, title: '' }, 'user-1')).rejects.toMatchObject({ status: 400 });
    });

    it('addTask inserts a task with generated id, todo status, and timestamps', async () => {
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('task-1');

        const result = await service.addTask(formTask, 'user-1');

        expect(result).toMatchObject({
            id: 'task-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            status: 'todo',
        });
        expect(mockTaskRepo.insert).toHaveBeenCalledWith(result);
    });

    it('getTasksByUserId throws 400 when userId is missing', async () => {
        await expect(service.getTasksByUserId('')).rejects.toMatchObject({ status: 400 });
    });

    it('getTasksByUserId returns the tasks from the repository', async () => {
        const tasks: Array<Task> = [
            {
                id: 'task-1',
                userId: 'user-1',
                title: 'Add 50 more listings',
                subject: 'product',
                importance: 'high',
                recurrence: 'none',
                status: 'todo',
                createdAt: new Date('2026-08-01T00:00:00.000Z'),
                updatedAt: new Date('2026-08-01T00:00:00.000Z'),
            },
        ];
        (mockTaskRepo.getByUserId as ReturnType<typeof mock>).mockResolvedValue(tasks);

        const result = await service.getTasksByUserId('user-1');

        expect(result).toEqual(tasks);
        expect(mockTaskRepo.getByUserId).toHaveBeenCalledWith('user-1');
    });

    it('updateTask throws 404 when task does not exist', async () => {
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.updateTask('task-1', { status: 'done' }, 'user-1')).rejects.toMatchObject({
            status: 404,
        });
    });

    it('updateTask throws 400 when update data is invalid', async () => {
        await expect(service.updateTask('task-1', { status: 'not-a-status' } as never, 'user-1')).rejects.toMatchObject(
            { status: 400 }
        );
    });

    it('updateTask strips userId, id, and createdAt from the update payload', async () => {
        const existing: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            subject: 'product',
            importance: 'high',
            recurrence: 'none',
            status: 'todo',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        const result = await service.updateTask(
            'task-1',
            {
                status: 'in_progress',
                userId: 'attacker-user-id',
                id: 'attacker-chosen-id',
                createdAt: new Date('2020-01-01T00:00:00.000Z'),
            } as never,
            'user-1'
        );

        expect(result.userId).toBe('user-1');
        expect(result.id).toBe('task-1');
        expect(result.createdAt).toEqual(existing.createdAt);
        expect(result.status).toBe('in_progress');
    });

    it('updateTask merges updates and bumps updatedAt', async () => {
        const existing: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            subject: 'product',
            importance: 'high',
            recurrence: 'none',
            status: 'todo',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        const result = await service.updateTask('task-1', { status: 'in_progress' }, 'user-1');

        expect(result.status).toBe('in_progress');
        expect(result.updatedAt.getTime()).toBeGreaterThan(existing.updatedAt.getTime());
        expect(mockTaskRepo.update).toHaveBeenCalledWith('task-1', result);
    });

    it('deleteTask throws 404 when task does not exist', async () => {
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.deleteTask('task-1', 'user-1')).rejects.toMatchObject({ status: 404 });
    });

    it('marking a non-recurring task done does not create a new task', async () => {
        const existing: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'One-off task',
            subject: 'marketing',
            importance: 'low',
            recurrence: 'none',
            status: 'todo',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        await service.updateTask('task-1', { status: 'done' }, 'user-1');

        expect(mockTaskRepo.insert).not.toHaveBeenCalled();
    });

    it('marking a daily recurring task done creates the next occurrence due +1 day', async () => {
        const existing: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'Post daily update',
            subject: 'marketing',
            importance: 'low',
            recurrence: 'daily',
            status: 'todo',
            dueDate: new Date('2026-08-10T00:00:00.000Z'),
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('task-2');

        await service.updateTask('task-1', { status: 'done' }, 'user-1');

        expect(mockTaskRepo.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'task-2',
                title: 'Post daily update',
                status: 'todo',
                dueDate: new Date('2026-08-11T00:00:00.000Z'),
            })
        );
    });

    it('marking a weekly recurring task done creates the next occurrence due +7 days', async () => {
        const existing: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'Review shop analytics',
            subject: 'finance',
            importance: 'medium',
            recurrence: 'weekly',
            status: 'in_progress',
            dueDate: new Date('2026-08-10T00:00:00.000Z'),
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('task-2');

        await service.updateTask('task-1', { status: 'done' }, 'user-1');

        expect(mockTaskRepo.insert).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'task-2', dueDate: new Date('2026-08-17T00:00:00.000Z') })
        );
    });
});
