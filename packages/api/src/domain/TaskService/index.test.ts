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
        service = new TaskService(mockTaskRepo, mockIdGenerator);
    });

    it('addTask throws 400 when userId is missing', async () => {
        await expect(service.addTask(formTask, '')).rejects.toMatchObject({ status: 400 });
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

    it('updateTask throws 404 when task does not exist', async () => {
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.updateTask('task-1', { status: 'done' }, 'user-1')).rejects.toMatchObject({
            status: 404,
        });
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
});
