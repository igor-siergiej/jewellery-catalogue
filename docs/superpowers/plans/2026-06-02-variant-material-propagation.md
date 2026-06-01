# Variant Material Price Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a material price is updated, propagate cost changes to variant-specific materials and recalculate `variants[].totalMaterialCosts` and `variants[].price`.

**Architecture:** Two fixes: (1) extend `MongoDesignRepository.findByMaterialId` to query variant option materials via `$or`; (2) add private `updateVariantMaterials` to `MaterialService` that rewrites `variationGroups[].options[].material` and recalculates variant costs, called from `propagateMaterialUpdateToDesigns`. Since no markup tracking exists, `variant.price = variant.totalMaterialCosts`.

**Tech Stack:** Bun, bun:test, MongoDB, TypeScript

---

## File Map

- **Modify:** `packages/api/src/infrastructure/MongoDesignRepository/index.ts` — fix `findByMaterialId` query
- **Modify:** `packages/api/src/infrastructure/MongoDesignRepository/index.test.ts` — add `findByMaterialId` tests
- **Modify:** `packages/api/src/domain/MaterialService/index.ts` — add `updateVariantMaterials`, `resolveVariantOptionMaterials`; update `propagateMaterialUpdateToDesigns`
- **Create:** `packages/api/src/domain/MaterialService/index.test.ts` — unit tests for variant propagation
- **Modify:** `packages/api/src/domain/MaterialService/index.integration.test.ts` — add variant integration test

---

### Task 1: Fix `MongoDesignRepository.findByMaterialId`

**Files:**
- Modify: `packages/api/src/infrastructure/MongoDesignRepository/index.test.ts`
- Modify: `packages/api/src/infrastructure/MongoDesignRepository/index.ts`

- [ ] **Step 1: Write failing tests**

Add inside `describe('MongoDesignRepository', ...)` in `packages/api/src/infrastructure/MongoDesignRepository/index.test.ts`:

```ts
describe('findByMaterialId', () => {
    it('should query both base materials and variation group option materials', async () => {
        const mockCursor = { toArray: mock().mockResolvedValue([]) };
        mockDesignsCollection.find.mockReturnValue(mockCursor);

        await repository.findByMaterialId('mat-1');

        expect(mockDesignsCollection.find).toHaveBeenCalledWith(
            {
                $or: [
                    { 'materials.id': 'mat-1' },
                    { 'variationGroups.options.material.id': 'mat-1' },
                ],
            },
            { projection: { _id: 0 } }
        );
    });

    it('should return designs matched by base material id', async () => {
        const design = {
            id: 'd1',
            materials: [{ id: 'mat-1', type: 'wire' }],
        } as unknown as Design;
        const mockCursor = { toArray: mock().mockResolvedValue([design]) };
        mockDesignsCollection.find.mockReturnValue(mockCursor);

        const result = await repository.findByMaterialId('mat-1');

        expect(result).toEqual([design]);
    });

    it('should return designs matched by variation group option material id', async () => {
        const design = {
            id: 'd1',
            materials: [],
            variationGroups: [{ id: 'g1', options: [{ id: 'o1', material: { id: 'mat-1' } }] }],
        } as unknown as Design;
        const mockCursor = { toArray: mock().mockResolvedValue([design]) };
        mockDesignsCollection.find.mockReturnValue(mockCursor);

        const result = await repository.findByMaterialId('mat-1');

        expect(result).toEqual([design]);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/api && bun test src/infrastructure/MongoDesignRepository/index.test.ts
```

Expected: tests in `findByMaterialId` block fail with query mismatch.

- [ ] **Step 3: Fix the query in `MongoDesignRepository`**

In `packages/api/src/infrastructure/MongoDesignRepository/index.ts`, replace:

```ts
async findByMaterialId(materialId: string): Promise<Array<Design>> {
    const docs = await this.collection()
        .find(
            {
                'materials.id': materialId,
            },
            { projection: { _id: 0 } }
        )
        .toArray();
    return docs.map((d) => this.migrate(d));
}
```

with:

```ts
async findByMaterialId(materialId: string): Promise<Array<Design>> {
    const docs = await this.collection()
        .find(
            {
                $or: [
                    { 'materials.id': materialId },
                    { 'variationGroups.options.material.id': materialId },
                ],
            },
            { projection: { _id: 0 } }
        )
        .toArray();
    return docs.map((d) => this.migrate(d));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/api && bun test src/infrastructure/MongoDesignRepository/index.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/infrastructure/MongoDesignRepository/index.ts \
        packages/api/src/infrastructure/MongoDesignRepository/index.test.ts
git commit -m "fix(designs): find by material also searches variant option materials"
```

---

### Task 2: Add `updateVariantMaterials` to `MaterialService`

**Files:**
- Create: `packages/api/src/domain/MaterialService/index.test.ts`
- Modify: `packages/api/src/domain/MaterialService/index.ts`

- [ ] **Step 1: Write failing unit tests**

Create `packages/api/src/domain/MaterialService/index.test.ts`:

```ts
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
    options: [
        { id: 'option-1', material: optionRequiredWire },
    ],
};

const variant: DesignVariant = {
    id: 'variant-1',
    name: 'Short',
    optionIds: ['option-1'],
    totalQuantity: 0,
    totalMaterialCosts: 0.03, // shared 0.02 + option 0.01
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

// design where the material appears ONLY in the variant option, not in base materials
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
            // After price update: pricePerMeter = 20/1000 = 0.02
            // shared cost = (200/100) * 0.02 = 0.04
            // option cost = (100/100) * 0.02 = 0.02
            // variant totalMaterialCosts = 0.04 + 0.02 = 0.06
            const updatedWire: Wire = { ...wireMaterial, pricePerPack: 20, pricePerMeter: 0.02 };

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
            // variant cost = 0 (no shared) + (100/100) * 0.02 = 0.02
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/api && bun test src/domain/MaterialService/index.test.ts
```

Expected: all variant propagation tests FAIL.

- [ ] **Step 3: Add private methods and update `propagateMaterialUpdateToDesigns`**

In `packages/api/src/domain/MaterialService/index.ts`, update the import at the top to include `DesignVariant` and `VariationGroup`:

```ts
import {
    type FormMaterial,
    FormMaterialSchemas,
    type Material,
    MaterialType,
    type RequiredMaterial,
    type UpdateMaterial,
    type DesignVariant,
    type VariationGroup,
} from '@jewellery-catalogue/types';
```

Replace `propagateMaterialUpdateToDesigns` with:

```ts
private async propagateMaterialUpdateToDesigns(
    materialId: string,
    updatedMaterial: Material,
    userId: string
): Promise<number> {
    const designs = await this.designRepo.findByMaterialId(materialId);
    let count = 0;

    for (const design of designs) {
        if (design.userId !== userId) continue;

        const updatedMaterials = design.materials.map((rm) => {
            if (rm.id !== materialId) return rm;
            return { ...rm, ...updatedMaterial };
        });

        const totalMaterialCosts = parseFloat(
            updatedMaterials.reduce((sum, rm) => sum + this.calculateRequiredMaterialCost(rm), 0).toFixed(2)
        );

        const variantUpdate = this.updateVariantMaterials(
            updatedMaterials,
            design.variationGroups,
            design.variants,
            materialId,
            updatedMaterial
        );

        await this.designRepo.update(design.id, {
            ...design,
            materials: updatedMaterials,
            totalMaterialCosts,
            ...(variantUpdate ?? {}),
        });
        count++;
    }

    return count;
}
```

Add these two private methods after `calculateRequiredMaterialCost`:

```ts
private updateVariantMaterials(
    updatedSharedMaterials: RequiredMaterial[],
    variationGroups: VariationGroup[] | undefined,
    variants: DesignVariant[] | undefined,
    materialId: string,
    updatedMaterial: Material
): { variationGroups: VariationGroup[]; variants: DesignVariant[] } | undefined {
    if (!variationGroups?.length || !variants?.length) return undefined;

    const updatedGroups = variationGroups.map((group) => ({
        ...group,
        options: group.options.map((option) =>
            option.material.id === materialId
                ? { ...option, material: { ...option.material, ...updatedMaterial } }
                : option
        ),
    }));

    const updatedVariants = variants.map((variant) => {
        const optionMaterials = this.resolveVariantOptionMaterials(variant.optionIds, updatedGroups);
        const totalMaterialCosts = parseFloat(
            [...updatedSharedMaterials, ...optionMaterials]
                .reduce((sum, rm) => sum + this.calculateRequiredMaterialCost(rm), 0)
                .toFixed(2)
        );
        return { ...variant, totalMaterialCosts, price: totalMaterialCosts };
    });

    return { variationGroups: updatedGroups, variants: updatedVariants };
}

private resolveVariantOptionMaterials(optionIds: string[], groups: VariationGroup[]): RequiredMaterial[] {
    const materials: RequiredMaterial[] = [];
    for (const optionId of optionIds) {
        for (const group of groups) {
            const option = group.options.find((o) => o.id === optionId);
            if (option) {
                materials.push(option.material);
                break;
            }
        }
    }
    return materials;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/api && bun test src/domain/MaterialService/index.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
cd packages/api && bun test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/MaterialService/index.ts \
        packages/api/src/domain/MaterialService/index.test.ts
git commit -m "feat(materials): propagate price updates to variant materials and costs"
```

---

### Task 3: Add integration test for variant propagation

**Files:**
- Modify: `packages/api/src/domain/MaterialService/index.integration.test.ts`

- [ ] **Step 1: Add variant test helpers and test cases**

In `packages/api/src/domain/MaterialService/index.integration.test.ts`, add these imports after the existing ones:

```ts
import type { DesignVariant, RequiredWire, VariationGroup } from '@jewellery-catalogue/types';
```

Add after `makeDesign`:

```ts
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
        // shared: (200/100)*0.01=0.02, option: (100/100)*0.01=0.01 → 0.03
        totalMaterialCosts: 0.03,
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
        // no shared, option: (100/100)*0.01=0.01
        totalMaterialCosts: 0.01,
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
```

Add these test cases inside `describe.if(RUN)('MaterialService (integration)', ...)` after the existing `describe('updateMaterial — cascade to designs', ...)` block:

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/domain/MaterialService/index.integration.test.ts
git commit -m "test(materials): add integration tests for variant material propagation"
```
