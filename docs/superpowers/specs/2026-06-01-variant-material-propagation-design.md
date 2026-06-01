# Variant Material Price Propagation

**Date:** 2026-06-01

## Problem

When a material's price is updated, `MaterialService.propagateMaterialUpdateToDesigns` only updates shared `design.materials` and `design.totalMaterialCosts`. Two bugs:

1. `MongoDesignRepository.findByMaterialId` queries only `materials.id` — misses designs where the material appears exclusively in `variationGroups.options.material`
2. Variant-specific materials (`variationGroups[].options[].material`) and variant costs (`variants[].totalMaterialCosts`, `variants[].price`) are never updated

## Scope

Backend only. No markup tracking yet — variant `price` = `totalMaterialCosts` after recalculation.

## Changes

### 1. `MongoDesignRepository.findByMaterialId`

Extend Mongo query from:
```ts
{ 'materials.id': materialId }
```
to:
```ts
{ $or: [
    { 'materials.id': materialId },
    { 'variationGroups.options.material.id': materialId }
]}
```

### 2. `MaterialService` — new private `updateVariantMaterials`

Signature:
```ts
private updateVariantMaterials(
    design: Design,
    materialId: string,
    updatedMaterial: Material
): { variationGroups: VariationGroup[]; variants: DesignVariant[] } | undefined
```

Logic:
1. If design has no `variationGroups` or `variants`, return `undefined` (no-op)
2. Walk `variationGroups`, replace any `option.material` where `id === materialId` with updated fields (spread `updatedMaterial` onto existing `RequiredMaterial`)
3. For each variant, resolve all option materials via `optionIds` lookup against updated groups
4. Compute variant `totalMaterialCosts` = sum of shared material costs + sum of option material costs using existing `calculateRequiredMaterialCost`
5. Set `variant.price = variant.totalMaterialCosts`
6. Return updated `variationGroups` and `variants`

### 3. `MaterialService.propagateMaterialUpdateToDesigns`

After computing `updatedMaterials` and `totalMaterialCosts`, call `updateVariantMaterials`. Merge result into `designRepo.update` payload:

```ts
const variantUpdate = this.updateVariantMaterials(design, materialId, updatedMaterial);

await this.designRepo.update(design.id, {
    ...design,
    materials: updatedMaterials,
    totalMaterialCosts,
    ...(variantUpdate ?? {}),
});
```

## Data Flow

```
updateMaterial()
  └─ propagateMaterialUpdateToDesigns(materialId, updatedMaterial)
       ├─ findByMaterialId (now checks base + variant option materials)
       └─ for each design:
            ├─ update design.materials (existing)
            ├─ recalculate design.totalMaterialCosts (existing)
            ├─ updateVariantMaterials() [new]
            │    ├─ update variationGroups[].options[].material
            │    └─ recalculate variants[].totalMaterialCosts + .price
            └─ designRepo.update (single write, all fields)
```

## Tests

- Unit: design with variant where material is in option → variant `totalMaterialCosts` and `price` updated
- Unit: design where material only in variant option (not base `materials`) → design found and updated
- Unit: design with no variants → unchanged, no error
- Existing tests: unaffected
