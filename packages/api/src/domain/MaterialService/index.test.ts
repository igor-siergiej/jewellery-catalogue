import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
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

import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { MaterialRepository } from '../MaterialRepository';
import { MaterialService } from './index';

const mockMaterialRepo = {
    getById: mock(),
    getByIdAndUserId: mock(),
    getByUserId: mock(),
    getAll: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
};

const mockDesignRepo = {
    getById: mock(),
    getByIdAndUserId: mock(),
    getByUserId: mock(),
    getAll: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
    findByMaterialId: mock(),
};

const mockIdGenerator = { generate: mock() };

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
    pricePerMeter: 0.01,
    dateAdded: '2024-01-01T00:00:00.000Z',
};

// shared material: 200cm wire → cost = (200/100) * 0.01 = 0.02
const sharedRequiredWire: RequiredWire = { ...wireMaterial, requiredLength: 200 };

// option material: same wire, 100cm → cost = (100/100) * 0.01 = 0.01
const optionRequiredWire: RequiredWire = { ...wireMaterial, requiredLength: 100 };

const variationGroup: VariationGroup = {
    id: 'group-1',
    name: 'Length',
    required: 1,
    options: [{ id: 'option-1', material: optionRequiredWire }],
};

const variant: DesignVariant = {
    id: 'variant-1',
    name: 'Short',
    optionIds: ['option-1'],
    totalQuantity: 0,
    totalMaterialCosts: 0.03,
    price: 0.03,
};

const designWithVariants: Design = {
    id: 'design-1',
    userId: 'user-1',
    name: 'Test Design',
    description: '',
    timeRequired: '30',
    totalMaterialCosts: 0.02,
    price: 0.03,
    imageIds: ['img-1'],
    materials: [sharedRequiredWire],
    dateAdded: new Date('2024-01-01'),
    totalQuantity: 0,
    variationGroups: [variationGroup],
    variants: [variant],
};

const designVariantOnlyMaterial: Design = {
    id: 'design-2',
    userId: 'user-1',
    name: 'Variant-only Design',
    description: '',
    timeRequired: '30',
    totalMaterialCosts: 0,
    price: 0.01,
    imageIds: ['img-2'],
    materials: [],
    dateAdded: new Date('2024-01-01'),
    totalQuantity: 0,
    variationGroups: [variationGroup],
    variants: [{ ...variant, totalMaterialCosts: 0.01, price: 0.01 }],
};

describe('MaterialService', () => {
    let service: MaterialService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new MaterialService(
            mockMaterialRepo as unknown as MaterialRepository,
            mockIdGenerator as unknown as IdGenerator,
            mockDesignRepo as unknown as DesignRepository
        );
    });

    describe('updateMaterial — variant propagation', () => {
        it('updates variant totalMaterialCosts and price when shared material price changes', async () => {
            // new pricePerMeter = 20/1000 = 0.02
            // shared: (200/100)*0.02 = 0.04, option: (100/100)*0.02 = 0.02 → 0.06
            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(wireMaterial);
            mockMaterialRepo.update.mockResolvedValue(undefined);
            mockDesignRepo.findByMaterialId.mockResolvedValue([designWithVariants]);
            mockDesignRepo.update.mockResolvedValue(undefined);

            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            expect(mockDesignRepo.update).toHaveBeenCalledWith(
                'design-1',
                expect.objectContaining({
                    variants: [
                        expect.objectContaining({
                            id: 'variant-1',
                            totalMaterialCosts: 0.06,
                            price: 0.06,
                        }),
                    ],
                })
            );
        });

        it('updates variationGroups option material fields when price changes', async () => {
            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(wireMaterial);
            mockMaterialRepo.update.mockResolvedValue(undefined);
            mockDesignRepo.findByMaterialId.mockResolvedValue([designWithVariants]);
            mockDesignRepo.update.mockResolvedValue(undefined);

            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            expect(mockDesignRepo.update).toHaveBeenCalledWith(
                'design-1',
                expect.objectContaining({
                    variationGroups: [
                        expect.objectContaining({
                            options: [
                                expect.objectContaining({
                                    id: 'option-1',
                                    material: expect.objectContaining({ pricePerMeter: 0.02 }),
                                }),
                            ],
                        }),
                    ],
                })
            );
        });

        it('updates variant costs when material only appears in variant option (not base materials)', async () => {
            // variant cost = 0 (no shared) + (100/100)*0.02 = 0.02
            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(wireMaterial);
            mockMaterialRepo.update.mockResolvedValue(undefined);
            mockDesignRepo.findByMaterialId.mockResolvedValue([designVariantOnlyMaterial]);
            mockDesignRepo.update.mockResolvedValue(undefined);

            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            expect(mockDesignRepo.update).toHaveBeenCalledWith(
                'design-2',
                expect.objectContaining({
                    variants: [
                        expect.objectContaining({
                            totalMaterialCosts: 0.02,
                            price: 0.02,
                        }),
                    ],
                })
            );
        });

        it('does not add variant fields to designs without variants', async () => {
            const designNoVariants: Design = {
                id: 'design-3',
                userId: 'user-1',
                name: 'No Variants',
                description: '',
                timeRequired: '30',
                totalMaterialCosts: 0.02,
                price: 0.05,
                imageIds: [],
                materials: [sharedRequiredWire],
                dateAdded: new Date('2024-01-01'),
                totalQuantity: 0,
            };

            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(wireMaterial);
            mockMaterialRepo.update.mockResolvedValue(undefined);
            mockDesignRepo.findByMaterialId.mockResolvedValue([designNoVariants]);
            mockDesignRepo.update.mockResolvedValue(undefined);

            await service.updateMaterial('mat-wire-1', { type: MaterialType.WIRE, pricePerPack: 20 }, 'user-1');

            const updateCall = mockDesignRepo.update.mock.calls[0][1];
            expect(updateCall.variants).toBeUndefined();
            expect(updateCall.variationGroups).toBeUndefined();
        });
    });
});
