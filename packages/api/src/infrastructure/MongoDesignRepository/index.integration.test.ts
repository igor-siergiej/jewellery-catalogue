import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import {
    type Design,
    MaterialType,
    METAL_TYPE,
    type RequiredWire,
    WIRE_TYPE,
    type Wire,
} from '@jewellery-catalogue/types';

import { CollectionNames } from '../../dependencies/types';
import { createTestContext, type TestContext } from '../../test-helpers/mongodb';
import { MongoDesignRepository } from './index';

const wire: Wire = {
    id: 'mat-1',
    userId: 'user-1',
    name: 'Silver Wire',
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

const requiredWire: RequiredWire = { ...wire, requiredLength: 200 };

function makeDesign(id: string, userId: string, materials: Design['materials'] = []): Design {
    return {
        id,
        userId,
        name: `Design ${id}`,
        description: '',
        timeRequired: '00:30',
        price: 5,
        totalMaterialCosts: 0.02,
        totalQuantity: 0,
        imageIds: [],
        materials,
        dateAdded: new Date('2024-01-01'),
    };
}

const RUN = !!process.env.RUN_INTEGRATION_TESTS;

describe.if(RUN)('MongoDesignRepository (integration)', () => {
    let ctx: TestContext;
    let repo: MongoDesignRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        repo = new MongoDesignRepository(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    describe('getByUserId', () => {
        it('returns only designs belonging to the given user', async () => {
            await repo.insert(makeDesign('d1', 'user-1'));
            await repo.insert(makeDesign('d2', 'user-1'));
            await repo.insert(makeDesign('d3', 'user-2'));

            const results = await repo.getByUserId('user-1');

            expect(results).toHaveLength(2);
            expect(results.every((d) => d.userId === 'user-1')).toBe(true);
        });

        it('returns empty array when user has no designs', async () => {
            await repo.insert(makeDesign('d1', 'user-2'));

            const results = await repo.getByUserId('user-1');

            expect(results).toHaveLength(0);
        });
    });

    describe('getByIdAndUserId', () => {
        it('returns design when id and userId both match', async () => {
            await repo.insert(makeDesign('d1', 'user-1'));

            const result = await repo.getByIdAndUserId('d1', 'user-1');

            expect(result?.id).toBe('d1');
        });

        it('returns null when userId does not match', async () => {
            await repo.insert(makeDesign('d1', 'user-1'));

            const result = await repo.getByIdAndUserId('d1', 'user-2');

            expect(result).toBeNull();
        });

        it('excludes _id from result', async () => {
            await repo.insert(makeDesign('d1', 'user-1'));

            const result = await repo.getByIdAndUserId('d1', 'user-1');

            expect((result as any)?._id).toBeUndefined();
        });
    });

    describe('findByMaterialId', () => {
        it('returns designs containing the given material in nested array', async () => {
            await repo.insert(makeDesign('d1', 'user-1', [requiredWire]));
            await repo.insert(makeDesign('d2', 'user-1', []));

            const results = await repo.findByMaterialId('mat-1');

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('d1');
        });

        it('returns empty array when no design uses the material', async () => {
            await repo.insert(makeDesign('d1', 'user-1', []));

            const results = await repo.findByMaterialId('mat-1');

            expect(results).toHaveLength(0);
        });

        it('returns designs across multiple users', async () => {
            await repo.insert(makeDesign('d1', 'user-1', [requiredWire]));
            await repo.insert(makeDesign('d2', 'user-2', [requiredWire]));

            const results = await repo.findByMaterialId('mat-1');

            expect(results).toHaveLength(2);
        });
    });

    describe('migrate', () => {
        it('converts legacy imageId field to imageIds array on read', async () => {
            await ctx.mongoDb.getCollection(CollectionNames.Designs).insertOne({
                id: 'legacy',
                userId: 'user-1',
                name: 'Legacy Design',
                description: '',
                timeRequired: '00:30',
                price: 0,
                totalMaterialCosts: 0,
                totalQuantity: 0,
                imageId: 'img-1',
                materials: [],
                dateAdded: new Date('2024-01-01'),
            } as any);

            const result = await repo.getByIdAndUserId('legacy', 'user-1');

            expect(result?.imageIds).toEqual(['img-1']);
            expect((result as any)?.imageId).toBeUndefined();
        });
    });
});
