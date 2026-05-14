import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { MaterialType, METAL_TYPE, WIRE_TYPE, type Wire } from '@jewellery-catalogue/types';

import { createTestContext, type TestContext } from '../../test-helpers/mongodb';
import { MongoMaterialRepository } from './index';

function makeWire(id: string, userId: string): Wire {
    return {
        id,
        userId,
        name: `Wire ${id}`,
        brand: 'Beadalon',
        purchaseUrl: 'https://example.com',
        type: MaterialType.WIRE,
        wireType: WIRE_TYPE.FULL,
        metalType: METAL_TYPE.SILVER,
        diameter: 0.5,
        lengthPerPack: 1000,
        pricePerPack: 10,
        totalLength: 1000,
        pricePerMeter: 0.01,
        dateAdded: '2024-01-01T00:00:00.000Z',
    };
}

const RUN = !!process.env.RUN_INTEGRATION_TESTS;

describe.if(RUN)('MongoMaterialRepository (integration)', () => {
    let ctx: TestContext;
    let repo: MongoMaterialRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        repo = new MongoMaterialRepository(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    describe('getByUserId', () => {
        it('returns only materials belonging to the given user', async () => {
            await repo.insert(makeWire('m1', 'user-1'));
            await repo.insert(makeWire('m2', 'user-1'));
            await repo.insert(makeWire('m3', 'user-2'));

            const results = await repo.getByUserId('user-1');

            expect(results).toHaveLength(2);
            expect(results.every((m) => m.userId === 'user-1')).toBe(true);
        });

        it('returns empty array when user has no materials', async () => {
            await repo.insert(makeWire('m1', 'user-2'));

            const results = await repo.getByUserId('user-1');

            expect(results).toHaveLength(0);
        });

        it('excludes _id from results', async () => {
            await repo.insert(makeWire('m1', 'user-1'));

            const results = await repo.getByUserId('user-1');

            expect((results[0] as any)?._id).toBeUndefined();
        });
    });

    describe('getByIdAndUserId', () => {
        it('returns material when id and userId both match', async () => {
            await repo.insert(makeWire('m1', 'user-1'));

            const result = await repo.getByIdAndUserId('m1', 'user-1');

            expect(result?.id).toBe('m1');
        });

        it('returns null when userId does not match', async () => {
            await repo.insert(makeWire('m1', 'user-1'));

            const result = await repo.getByIdAndUserId('m1', 'user-2');

            expect(result).toBeNull();
        });

        it('returns null when id does not exist', async () => {
            const result = await repo.getByIdAndUserId('nonexistent', 'user-1');

            expect(result).toBeNull();
        });
    });
});
