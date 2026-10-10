import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { createTestContext, type TestContext } from '../../test-helpers/mongodb';
import { ensureAiUsageIndexes, MongoAiUsageRepository } from './index';

const RUN = !!process.env.RUN_INTEGRATION_TESTS;

describe.if(RUN)('MongoAiUsageRepository (integration)', () => {
    let ctx: TestContext;
    let repo: MongoAiUsageRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        await ensureAiUsageIndexes(ctx.mongoDb);
        repo = new MongoAiUsageRepository(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    it("counts only the user's calls at or after the given time", async () => {
        const entry = (userId: string, at: number) => ({
            userId,
            feature: 'f',
            model: 'm',
            latencyMs: 1,
            success: true,
            status: 200,
            at: new Date(at),
        });
        await repo.record(entry('user-1', 1000));
        await repo.record(entry('user-1', 2000));
        await repo.record(entry('user-1', 3000));
        await repo.record(entry('user-2', 3000));

        expect(await repo.countSince('user-1', new Date(2000))).toBe(2);
        expect(await repo.countSince('user-2', new Date(0))).toBe(1);
    });
});
