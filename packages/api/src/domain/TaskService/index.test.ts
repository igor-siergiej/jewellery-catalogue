import { beforeEach, describe, expect, it, type Mock, mock } from 'bun:test';
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
    deleteCompletedBefore: mock(),
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
        (mockTaskRepo.deleteCompletedBefore as Mock<(cutoff: Date) => Promise<number>>).mockClear();
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
            favourite: false,
        });
        expect(mockTaskRepo.insert).toHaveBeenCalledWith(result);
    });

    it('addTask stores an optional description', async () => {
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('task-1');

        const result = await service.addTask({ ...formTask, description: 'Order from the usual supplier' }, 'user-1');

        expect(result.description).toBe('Order from the usual supplier');
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

    it('updateTask toggles favourite', async () => {
        const existing: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            subject: 'product',
            importance: 'high',
            recurrence: 'none',
            status: 'todo',
            favourite: false,
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        const result = await service.updateTask('task-1', { favourite: true }, 'user-1');

        expect(result.favourite).toBe(true);
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

    it('resets checklist items to unchecked on the next occurrence of a recurring task', async () => {
        const existing: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'Restock packaging',
            subject: 'product',
            importance: 'medium',
            recurrence: 'weekly',
            status: 'todo',
            dueDate: new Date('2026-08-10T00:00:00.000Z'),
            checklist: [
                { id: 'item-1', text: 'Count boxes', done: true },
                { id: 'item-2', text: 'Order labels', done: true },
            ],
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockTaskRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('task-2');

        await service.updateTask('task-1', { status: 'done' }, 'user-1');

        expect(mockTaskRepo.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'task-2',
                checklist: [
                    { id: 'item-1', text: 'Count boxes', done: false },
                    { id: 'item-2', text: 'Order labels', done: false },
                ],
            })
        );
    });

    describe('completedAt', () => {
        const baseTask: Task = {
            id: 'task-1',
            userId: 'user-1',
            title: 'Order beads',
            subject: 'product',
            importance: 'medium',
            recurrence: 'none',
            status: 'todo',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        const getExisting = mockTaskRepo.getByIdAndUserId as Mock<(id: string, userId: string) => Promise<Task | null>>;

        it('stamps completedAt when a task moves to done', async () => {
            getExisting.mockResolvedValue(baseTask);
            const before = Date.now();

            const result = await service.updateTask('task-1', { status: 'done' }, 'user-1');

            expect(result.completedAt).toBeInstanceOf(Date);
            expect(result.completedAt?.getTime()).toBeGreaterThanOrEqual(before);
        });

        it('clears completedAt when a done task is reopened', async () => {
            getExisting.mockResolvedValue({
                ...baseTask,
                status: 'done',
                completedAt: new Date('2026-08-05T00:00:00.000Z'),
            });

            const result = await service.updateTask('task-1', { status: 'in_progress' }, 'user-1');

            expect(result.completedAt).toBeUndefined();
        });

        it('keeps the original completedAt when a done task is edited', async () => {
            const completedAt = new Date('2026-08-05T00:00:00.000Z');
            getExisting.mockResolvedValue({ ...baseTask, status: 'done', completedAt });

            const result = await service.updateTask('task-1', { favourite: true }, 'user-1');

            expect(result.completedAt).toEqual(completedAt);
        });

        it('pins a legacy done task without completedAt to its previous updatedAt when edited', async () => {
            getExisting.mockResolvedValue({
                ...baseTask,
                status: 'done',
                updatedAt: new Date('2026-08-05T00:00:00.000Z'),
            });

            const result = await service.updateTask('task-1', { favourite: true }, 'user-1');

            expect(result.completedAt).toEqual(new Date('2026-08-05T00:00:00.000Z'));
        });

        it('ignores a client supplied completedAt', async () => {
            getExisting.mockResolvedValue(baseTask);

            const result = await service.updateTask(
                'task-1',
                { completedAt: new Date('2020-01-01T00:00:00.000Z') } as never,
                'user-1'
            );

            expect(result.completedAt).toBeUndefined();
        });

        it('does not carry completedAt onto the next occurrence of a recurring task', async () => {
            getExisting.mockResolvedValue({
                ...baseTask,
                recurrence: 'daily',
                dueDate: new Date('2026-08-10T00:00:00.000Z'),
            });
            (mockIdGenerator.generate as Mock<() => string>).mockReturnValue('task-2');

            await service.updateTask('task-1', { status: 'done' }, 'user-1');

            const inserted = (mockTaskRepo.insert as Mock<(task: Task) => Promise<void>>).mock.calls[0]?.[0] as Task;
            expect(inserted.status).toBe('todo');
            expect(inserted.completedAt).toBeUndefined();
        });
    });

    describe('purgeCompletedTasks', () => {
        it('deletes tasks completed more than 30 days before now and returns the count', async () => {
            (mockTaskRepo.deleteCompletedBefore as Mock<(cutoff: Date) => Promise<number>>).mockResolvedValue(3);

            const deleted = await service.purgeCompletedTasks(new Date('2026-09-30T12:00:00.000Z'));

            expect(deleted).toBe(3);
            expect(mockTaskRepo.deleteCompletedBefore).toHaveBeenCalledWith(new Date('2026-08-31T12:00:00.000Z'));
        });
    });
});
