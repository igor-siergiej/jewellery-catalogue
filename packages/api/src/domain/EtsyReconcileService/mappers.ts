import {
    type DesignVariant,
    type Material,
    MaterialType,
    type RequiredMaterial,
    type VariationGroup,
} from '@jewellery-catalogue/types';

import type { EtsyListingInventory } from '../EtsyClient';
import type { IdGenerator } from '../IdGenerator';

const DEFAULT_REQUIRED_AMOUNT = 1;

const toRequiredMaterial = (material: Material, amount: number): RequiredMaterial => {
    switch (material.type) {
        case MaterialType.WIRE:
        case MaterialType.CHAIN:
            return { ...material, requiredLength: amount };
        case MaterialType.BEAD:
        case MaterialType.EAR_HOOK:
            return { ...material, requiredQuantity: amount };
    }
};

export interface ImportedVariations {
    variationGroups: VariationGroup[];
    variants: DesignVariant[];
    // Etsy property values (e.g. "Size: XL") that don't match an existing catalogue
    // material by name, and so couldn't be imported — surfaced for the caller to log.
    unmatchedPropertyValues: string[];
}

// Etsy's listing variations are free-text property/value pairs with no link to this
// catalogue's materials. We can only safely import a value when it matches an
// existing material's name exactly (case-insensitively) — anything else would mean
// fabricating a fake material with made-up cost/stock data, so it's skipped instead.
export const mapEtsyInventoryToVariations = (
    inventory: EtsyListingInventory,
    existingMaterials: Material[],
    idGenerator: IdGenerator
): ImportedVariations => {
    const materialByName = new Map(existingMaterials.map((m) => [m.name.trim().toLowerCase(), m]));
    const groupOptions = new Map<string, Map<string, { id: string; material: RequiredMaterial }>>();
    const unmatchedPropertyValues: string[] = [];

    for (const product of inventory.products) {
        for (const propertyValue of product.propertyValues) {
            let optionsForGroup = groupOptions.get(propertyValue.propertyName);
            if (!optionsForGroup) {
                optionsForGroup = new Map();
                groupOptions.set(propertyValue.propertyName, optionsForGroup);
            }

            for (const value of propertyValue.values) {
                if (optionsForGroup.has(value)) continue;

                const material = materialByName.get(value.trim().toLowerCase());
                if (!material) {
                    unmatchedPropertyValues.push(`${propertyValue.propertyName}: ${value}`);
                    continue;
                }

                optionsForGroup.set(value, {
                    id: idGenerator.generate(),
                    material: toRequiredMaterial(material, DEFAULT_REQUIRED_AMOUNT),
                });
            }
        }
    }

    const variationGroups: VariationGroup[] = Array.from(groupOptions.entries())
        .filter(([, options]) => options.size > 0)
        .map(([propertyName, options]) => ({
            id: idGenerator.generate(),
            name: propertyName,
            required: 1,
            options: Array.from(options.values()),
        }));

    const variants: DesignVariant[] = [];
    for (const product of inventory.products) {
        const optionIds: string[] = [];
        const nameParts: string[] = [];
        let allMatched = product.propertyValues.length > 0;

        for (const propertyValue of product.propertyValues) {
            const value = propertyValue.values[0];
            const option = value === undefined ? undefined : groupOptions.get(propertyValue.propertyName)?.get(value);
            if (!option) {
                allMatched = false;
                break;
            }
            optionIds.push(option.id);
            nameParts.push(value);
        }

        if (!allMatched) continue;

        const offering = product.offerings.find((o) => o.isEnabled) ?? product.offerings[0];
        if (!offering) continue;

        variants.push({
            id: idGenerator.generate(),
            optionIds,
            name: nameParts.join(' / '),
            totalQuantity: offering.quantity,
            totalMaterialCosts: 0,
            price: offering.price,
        });
    }

    return { variationGroups, variants, unmatchedPropertyValues };
};
