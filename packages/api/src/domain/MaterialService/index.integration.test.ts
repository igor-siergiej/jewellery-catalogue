import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import {
    type Design,
    type DesignVariant,
    MaterialType,
    METAL_TYPE,
    type RequiredWire,
    type VariationGroup,
    WIRE_TYPE,
    type Wire,
} from '@jewellery-catalogue/types';

import { MongoDesignRepository } from '../../infrastructure/MongoDesignRepository';
import { MongoMaterialRepository } from '../../infrastructure/MongoMaterialRepository';
import { UuidGenerator } from '../../infrastructure/UuidGenerator';
import { createTestContext, type TestContext } from '../../test-helpers/mongodb';
import { MaterialService } from './index';

const wireMaterial: Wire = {
    id: 'mat-wire-1',
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
    pricePerMeter: 0.01, // 10 / 1000
    dateAdded: '2024-01-01T00:00:00.000Z',
};

// cost = (200cm / 100) * 0.01/m = 0.02
const requiredWire: RequiredWire = { ...wireMaterial, requiredLength: 200 };

function makeDesign(id: string, userId: string): Design {
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
        materials: [requiredWire],
        dateAdded: new Date('2024-01-01'),
    };
}

function makeDesignWithVariants(id: string, userId: string): Design {
    const sharedWire: RequiredWire = { ...wireMaterial, requiredLength: 200 };
    const optionWire: RequiredWire = { ...wireMaterial, requiredLength: 100 };

    const group: VariationGroup = {
        id: 'group-1',
        name: 'Length',
        required: 1,
        options: [{ id: 'option-1', material: optionWire }],
    };

    const variant: DesignVariant = {
        id: 'variant-1',
        name: 'Short',
        optionIds: ['option-1'],
        totalQuantity: 0,
        totalMaterialCosts: 0.03, // shared: (200/100)*0.01=0.02, option: (100/100)*0.01=0.01
        price: 0.03,
    };

    return {
        id,
        userId,
        name: `Design ${id}`,
        description: '',
        timeRequired: '00:30',
        price: 0.03,
        totalMaterialCosts: 0.02,
        totalQuantity: 0,
        imageIds: [],
        materials: [sharedWire],
        variationGroups: [group],
        variants: [variant],
        dateAdded: new Date('2024-01-01'),
    };
}

function makeDesignVariantOnlyMaterial(id: string, userId: string): Design {
    const optionWire: RequiredWire = { ...wireMaterial, requiredLength: 100 };

    const group: VariationGroup = {
        id: 'group-1',
        name: 'Length',
        required: 1,
        options: [{ id: 'option-1', material: optionWire }],
    };

    const variant: DesignVariant = {
        id: 'variant-1',
        name: 'Short',
        optionIds: ['option-1'],
        totalQuantity: 0,
        totalMaterialCosts: 0.01, // no shared, option: (100/100)*0.01=0.01
        price: 0.01,
    };

    return {
        id,
        userId,
        name: `Design ${id}`,
        description: '',
        timeRequired: '00:30',
        price: 0.01,
        totalMaterialCosts: 0,
        totalQuantity: 0,
        imageIds: [],
        materials: [],
        variationGroups: [group],
        variants: [variant],
        dateAdded: new Date('2024-01-01'),
    };
}

const RUN = !!process.env.RUN_INTEGRATION_TESTS;

describe.if(RUN)('MaterialService (integration)', () => {
    let ctx: TestContext;
    let service: MaterialService;
    let materialRepo: MongoMaterialRepository;
    let designRepo: MongoDesignRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        materialRepo = new MongoMaterialRepository(ctx.mongoDb);
        designRepo = new MongoDesignRepository(ctx.mongoDb);
        service = new MaterialService(materialRepo, new UuidGenerator(), designRepo);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    describe('updateMaterial — cascade to designs', () => {
        it("propagates price change to all user's designs using that material", async () => {
            await materialRepo.insert(wireMaterial);
            await designRepo.insert(makeDesign('d1', 'user-1'));
            await designRepo.insert(makeDesign('d2', 'user-1'));

            // doubling price: newPricePerMeter = 20/1000 = 0.02
            // new cost = (200/100) * 0.02 = 0.04
            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            const d1 = await designRepo.getByIdAndUserId('d1', 'user-1');
            const d2 = await designRepo.getByIdAndUserId('d2', 'user-1');

            expect(d1?.totalMaterialCosts).toBe(0.04);
            expect(d2?.totalMaterialCosts).toBe(0.04);
        });

        it('does not update designs belonging to a different user', async () => {
            await materialRepo.insert(wireMaterial);
            await designRepo.insert(makeDesign('d-other', 'user-2'));

            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            const d = await designRepo.getByIdAndUserId('d-other', 'user-2');
            expect(d?.totalMaterialCosts).toBe(0.02);
        });

        it('updates pricePerMeter on the material in DB', async () => {
            await materialRepo.insert(wireMaterial);

            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            const updated = await materialRepo.getByIdAndUserId('mat-wire-1', 'user-1');
            expect((updated as Wire).pricePerMeter).toBe(0.02);
        });

        it('throws 404 when material does not exist', async () => {
            await expect(
                service.updateMaterial('nonexistent', { type: MaterialType.WIRE }, 'user-1')
            ).rejects.toMatchObject({ status: 404 });
        });
    });

    describe('updateMaterial — variant propagation', () => {
        it('updates variant totalMaterialCosts and price when shared material price changes', async () => {
            await materialRepo.insert(wireMaterial);
            await designRepo.insert(makeDesignWithVariants('d-variant', 'user-1'));

            // new pricePerMeter = 20/1000 = 0.02
            // shared: (200/100)*0.02 = 0.04, option: (100/100)*0.02 = 0.02 → 0.06
            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            const updated = await designRepo.getByIdAndUserId('d-variant', 'user-1');
            expect(updated?.variants?.[0]?.totalMaterialCosts).toBe(0.06);
            expect(updated?.variants?.[0]?.price).toBe(0.06);
        });

        it('updates variationGroups option material price when material price changes', async () => {
            await materialRepo.insert(wireMaterial);
            await designRepo.insert(makeDesignWithVariants('d-variant2', 'user-1'));

            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            const updated = await designRepo.getByIdAndUserId('d-variant2', 'user-1');
            const optionMaterial = updated?.variationGroups?.[0]?.options?.[0]?.material as any;
            expect(optionMaterial?.pricePerMeter).toBe(0.02);
        });

        it('finds and updates design where material appears only in variant option', async () => {
            await materialRepo.insert(wireMaterial);
            await designRepo.insert(makeDesignVariantOnlyMaterial('d-variant-only', 'user-1'));

            // option: (100/100)*0.02 = 0.02
            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            const updated = await designRepo.getByIdAndUserId('d-variant-only', 'user-1');
            expect(updated?.variants?.[0]?.totalMaterialCosts).toBe(0.02);
            expect(updated?.variants?.[0]?.price).toBe(0.02);
        });
    });
});
