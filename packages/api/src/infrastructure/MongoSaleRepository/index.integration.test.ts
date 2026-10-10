import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Design, Sale } from '@jewellery-catalogue/types';

import { createTestContext, type TestContext } from '../../test-helpers/mongodb';
import { MongoDesignRepository } from '../MongoDesignRepository';
import { ensureSaleIndexes, MongoSaleRepository } from './index';

const RUN = !!process.env.RUN_INTEGRATION_TESTS;

const makeSale = (overrides: Partial<Sale> = {}): Sale => ({
    userId: 'user-1',
    designId: 'design-1',
    variantId: null,
    listingId: 31,
    receiptId: 11,
    transactionId: 21,
    title: 'Ring',
    quantity: 1,
    price: 25,
    soldAt: 1_700_000_000_000,
    status: 'pending',
    ...overrides,
});

const makeDesign = (overrides: Partial<Design> = {}): Design => ({
    id: 'design-1',
    userId: 'user-1',
    name: 'Ring',
    description: '',
    timeRequired: '01:00',
    materials: [],
    imageIds: [],
    diagramImageIds: [],
    makingNotes: '',
    price: 25,
    totalMaterialCosts: 10,
    dateAdded: new Date(),
    totalQuantity: 3,
    ...overrides,
});

describe.if(RUN)('MongoSaleRepository (integration)', () => {
    let ctx: TestContext;
    let repo: MongoSaleRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        repo = new MongoSaleRepository(ctx.mongoDb);
        await ensureSaleIndexes(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    it('rejects a second sale with the same transactionId via the unique index', async () => {
        expect(await repo.insertIfNew(makeSale())).toBe(true);
        expect(await repo.insertIfNew(makeSale({ quantity: 5 }))).toBe(false);

        expect(await repo.getPendingByUserId('user-1')).toEqual([makeSale()]);
    });

    it('lists unmatched sales newest first and moves sales between statuses', async () => {
        await repo.insertIfNew(makeSale({ transactionId: 1, status: 'unmatched', soldAt: 1 }));
        await repo.insertIfNew(makeSale({ transactionId: 2, status: 'unmatched', soldAt: 2 }));
        await repo.insertIfNew(makeSale({ transactionId: 3 }));

        await repo.setStatus(3, 'applied');

        expect((await repo.getUnmatchedByUserId('user-1')).map((s) => s.transactionId)).toEqual([2, 1]);
        expect(await repo.getPendingByUserId('user-1')).toEqual([]);
    });
});

describe.if(RUN)('MongoSaleRepository reporting queries (integration)', () => {
    let ctx: TestContext;
    let repo: MongoSaleRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        repo = new MongoSaleRepository(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    it('filters by soldAt with an inclusive start and exclusive end, scoped to the user', async () => {
        for (const [transactionId, soldAt] of [
            [1, 100],
            [2, 150],
            [3, 200],
        ]) {
            await repo.insertIfNew(makeSale({ transactionId, soldAt }));
        }
        await repo.insertIfNew(makeSale({ transactionId: 4, soldAt: 150, userId: 'other' }));

        const ids = async (from: number | null, to: number | null) =>
            (await repo.getByUserIdSoldBetween('user-1', from, to)).map((s) => s.transactionId).sort();

        expect(await ids(100, 200)).toEqual([1, 2]);
        expect(await ids(150, null)).toEqual([2, 3]);
        expect(await ids(null, null)).toEqual([1, 2, 3]);
    });

    it('hasAnyForUser reflects whether the user has any sale at all', async () => {
        expect(await repo.hasAnyForUser('user-1')).toBe(false);
        await repo.insertIfNew(makeSale({ status: 'unmatched' }));
        expect(await repo.hasAnyForUser('user-1')).toBe(true);
    });
});

describe.if(RUN)('MongoDesignRepository.applyEtsySale (integration)', () => {
    let ctx: TestContext;
    let designs: MongoDesignRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        designs = new MongoDesignRepository(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    const apply = (overrides: Partial<Parameters<MongoDesignRepository['applyEtsySale']>[0]> = {}) =>
        designs.applyEtsySale({
            designId: 'design-1',
            userId: 'user-1',
            variantId: null,
            transactionId: 21,
            quantity: 2,
            ...overrides,
        });

    it('deducts stock exactly once per transaction', async () => {
        await designs.insert(makeDesign());

        expect(await apply()).toBe('applied');
        expect(await apply()).toBe('already_applied');

        const design = await designs.getByIdAndUserId('design-1', 'user-1');
        expect(design?.totalQuantity).toBe(1);
        expect(design?.etsySaleIds).toEqual([21]);
    });

    it('never takes stock below zero', async () => {
        await designs.insert(makeDesign({ totalQuantity: 1 }));

        await apply({ quantity: 3 });

        expect((await designs.getByIdAndUserId('design-1', 'user-1'))?.totalQuantity).toBe(0);
    });

    it('deducts from the sold variant and recomputes the design total', async () => {
        await designs.insert(
            makeDesign({
                totalQuantity: 5,
                variants: [
                    { id: 'v-1', optionIds: [], name: 'A', totalQuantity: 2, totalMaterialCosts: 1, price: 1 },
                    { id: 'v-2', optionIds: [], name: 'B', totalQuantity: 3, totalMaterialCosts: 1, price: 1 },
                ],
            })
        );

        await apply({ variantId: 'v-2', quantity: 1 });

        const design = await designs.getByIdAndUserId('design-1', 'user-1');
        expect(design?.variants?.map((v) => v.totalQuantity)).toEqual([2, 2]);
        expect(design?.totalQuantity).toBe(4);
    });

    it('leaves stock alone and reports design_not_found when the variant was deleted', async () => {
        await designs.insert(
            makeDesign({
                totalQuantity: 2,
                variants: [{ id: 'v-1', optionIds: [], name: 'A', totalQuantity: 2, totalMaterialCosts: 1, price: 1 }],
            })
        );

        expect(await apply({ variantId: 'v-gone' })).toBe('design_not_found');
        expect((await designs.getByIdAndUserId('design-1', 'user-1'))?.totalQuantity).toBe(2);
    });

    it("reports design_not_found for another user's design", async () => {
        await designs.insert(makeDesign({ userId: 'someone-else' }));

        expect(await apply()).toBe('design_not_found');
    });
});
