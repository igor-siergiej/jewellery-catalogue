import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Task } from '@jewellery-catalogue/types';

import { createTestContext, type TestContext } from '../../test-helpers/mongodb';
import { MongoTaskRepository } from './index';

const DAY_MS = 24 * 60 * 60 * 1000;
const CUTOFF = new Date('2026-09-30T00:00:00.000Z');

const daysBeforeCutoff = (days: number) => new Date(CUTOFF.getTime() - days * DAY_MS);

function makeTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
    return {
        userId: 'user-1',
        title: 'Task',
        subject: 'product',
        importance: 'medium',
        recurrence: 'none',
        status: 'done',
        createdAt: daysBeforeCutoff(90),
        updatedAt: daysBeforeCutoff(90),
        ...overrides,
    };
}

const RUN = !!process.env.RUN_INTEGRATION_TESTS;

describe.if(RUN)('MongoTaskRepository (integration)', () => {
    let ctx: TestContext;
    let repo: MongoTaskRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        repo = new MongoTaskRepository(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    const remainingIds = async () => (await repo.getAll()).map((t) => t.id).sort();

    it('deletes done tasks completed before the cutoff, across users, and keeps newer ones', async () => {
        await repo.insert(makeTask({ id: 'old', completedAt: daysBeforeCutoff(1) }));
        await repo.insert(makeTask({ id: 'old-other-user', userId: 'user-2', completedAt: daysBeforeCutoff(40) }));
        await repo.insert(makeTask({ id: 'recent', completedAt: new Date(CUTOFF.getTime() + DAY_MS) }));

        const deleted = await repo.deleteCompletedBefore(CUTOFF);

        expect(deleted).toBe(2);
        expect(await remainingIds()).toEqual(['recent']);
    });

    it('never deletes unfinished tasks, however old', async () => {
        await repo.insert(makeTask({ id: 'todo', status: 'todo', completedAt: undefined }));
        await repo.insert(makeTask({ id: 'in-progress', status: 'in_progress', completedAt: undefined }));
        // A reopened task whose completedAt was somehow left behind must still be safe.
        await repo.insert(makeTask({ id: 'stale-stamp', status: 'todo', completedAt: daysBeforeCutoff(60) }));

        const deleted = await repo.deleteCompletedBefore(CUTOFF);

        expect(deleted).toBe(0);
        expect(await remainingIds()).toEqual(['in-progress', 'stale-stamp', 'todo']);
    });

    it('falls back to updatedAt for legacy done tasks that have no completedAt', async () => {
        await repo.insert(makeTask({ id: 'legacy-old', updatedAt: daysBeforeCutoff(5) }));
        await repo.insert(makeTask({ id: 'legacy-recent', updatedAt: new Date(CUTOFF.getTime() + DAY_MS) }));

        const deleted = await repo.deleteCompletedBefore(CUTOFF);

        expect(deleted).toBe(1);
        expect(await remainingIds()).toEqual(['legacy-recent']);
    });

    it('prefers completedAt over updatedAt when both exist', async () => {
        // Edited yesterday, but completed long ago: must be purged.
        await repo.insert(
            makeTask({
                id: 'edited-after',
                completedAt: daysBeforeCutoff(45),
                updatedAt: new Date(CUTOFF.getTime() + DAY_MS),
            })
        );

        const deleted = await repo.deleteCompletedBefore(CUTOFF);

        expect(deleted).toBe(1);
    });
});
