import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { EtsyConnection } from '@jewellery-catalogue/types';

import { createTestContext, type TestContext } from '../../test-helpers/mongodb';
import { MongoEtsyConnectionRepository } from './index';

function makeConnection(userId: string): EtsyConnection {
    return {
        userId,
        shopId: 47408839,
        shopName: 'MariCrystalJewellery',
        accessToken: 'access-token',
        accessTokenExpiresAt: Date.now() + 3600_000,
        refreshToken: 'refresh-token',
        connectedAt: Date.now(),
    };
}

const RUN = !!process.env.RUN_INTEGRATION_TESTS;

describe.if(RUN)('MongoEtsyConnectionRepository (integration)', () => {
    let ctx: TestContext;
    let repo: MongoEtsyConnectionRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        repo = new MongoEtsyConnectionRepository(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    it('returns null when no connection exists for the user', async () => {
        expect(await repo.getByUserId('user-1')).toBeNull();
    });

    it('upsert then getByUserId round-trips the connection, excluding _id', async () => {
        const connection = makeConnection('user-1');
        await repo.upsert(connection);

        const result = await repo.getByUserId('user-1');

        expect(result).toEqual(connection);
        expect((result as any)?._id).toBeUndefined();
    });

    it('upsert replaces the existing connection for the same user', async () => {
        await repo.upsert(makeConnection('user-1'));
        const updated = { ...makeConnection('user-1'), shopName: 'RenamedShop' };
        await repo.upsert(updated);

        const result = await repo.getByUserId('user-1');

        expect(result?.shopName).toBe('RenamedShop');
    });

    it('deleteByUserId removes the connection', async () => {
        await repo.upsert(makeConnection('user-1'));
        await repo.deleteByUserId('user-1');

        expect(await repo.getByUserId('user-1')).toBeNull();
    });
});
