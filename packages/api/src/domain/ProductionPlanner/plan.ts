import type {
    Design,
    Material,
    ProducibleSummary,
    RequiredMaterial,
    ShoppingList,
    ShoppingListLine,
    ShoppingListRequest,
} from '@jewellery-catalogue/types';

import { packSizeOf, requiredStockAmount, stockOnHand, stockUnitOf } from '../../utils/material-conversion';

// Absorbs floating-point dust such as 0.3 / 0.1 = 2.9999999999999996.
const EPSILON = 1e-9;

const round = (value: number, places: number): number => {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
};

interface Requirement {
    // The design embeds a snapshot of each material; used when the material has since been deleted.
    snapshot: RequiredMaterial;
    amount: number;
}

const requirementsPerUnit = (design: Design, variantId: string | null): Map<string, Requirement> => {
    const required: RequiredMaterial[] = [...design.materials];

    if (variantId) {
        const variant = design.variants?.find((v) => v.id === variantId);
        for (const optionId of variant?.optionIds ?? []) {
            const option = design.variationGroups?.flatMap((g) => g.options).find((o) => o.id === optionId);
            if (option) required.push(option.material);
        }
    }

    const byMaterial = new Map<string, Requirement>();
    for (const material of required) {
        const existing = byMaterial.get(material.id);
        byMaterial.set(material.id, {
            snapshot: material,
            amount: (existing?.amount ?? 0) + requiredStockAmount(material),
        });
    }
    return byMaterial;
};

const maxProducible = (requirements: Map<string, Requirement>, materialsById: Map<string, Material>): number | null => {
    let limit: number | null = null;

    for (const [materialId, { amount }] of requirements) {
        if (amount <= 0) continue;
        const material = materialsById.get(materialId);
        const possible = material ? Math.floor(stockOnHand(material) / amount + EPSILON) : 0;
        limit = limit === null ? possible : Math.min(limit, possible);
    }

    return limit === null ? null : Math.max(0, limit);
};

export const summariseProducible = (design: Design, materialsById: Map<string, Material>): ProducibleSummary => {
    const variants = (design.variants ?? []).map((variant) => ({
        variantId: variant.id,
        name: variant.name,
        canMake: maxProducible(requirementsPerUnit(design, variant.id), materialsById),
    }));

    if (variants.length === 0) {
        return {
            designId: design.id,
            canMake: maxProducible(requirementsPerUnit(design, null), materialsById),
            variants,
        };
    }

    const counts = variants.map((v) => v.canMake).filter((n): n is number => n !== null);
    return {
        designId: design.id,
        canMake: counts.length > 0 ? Math.max(...counts) : null,
        variants,
    };
};

export const buildShoppingList = (
    items: ShoppingListRequest['items'],
    designsById: Map<string, Design>,
    materialsById: Map<string, Material>
): ShoppingList => {
    const totals = new Map<string, Requirement>();

    for (const item of items) {
        const design = designsById.get(item.designId);
        if (!design) continue;
        for (const [materialId, requirement] of requirementsPerUnit(design, item.variantId ?? null)) {
            const existing = totals.get(materialId);
            totals.set(materialId, {
                snapshot: requirement.snapshot,
                amount: (existing?.amount ?? 0) + requirement.amount * item.quantity,
            });
        }
    }

    const lines: ShoppingListLine[] = [...totals.entries()].map(([materialId, { snapshot, amount }]) => {
        const material = materialsById.get(materialId);
        const source: Material = material ?? snapshot;
        const inStock = material ? stockOnHand(material) : 0;
        const shortfall = Math.max(0, amount - inStock);
        const packSize = packSizeOf(source);
        const packsToBuy = shortfall > EPSILON && packSize > 0 ? Math.ceil(shortfall / packSize - EPSILON) : 0;

        return {
            materialId,
            name: source.name,
            brand: source.brand,
            purchaseUrl: source.purchaseUrl,
            unit: stockUnitOf(source.type),
            required: round(amount, 3),
            inStock: round(inStock, 3),
            shortfall: round(shortfall, 3),
            packSize,
            packsToBuy,
            pricePerPack: source.pricePerPack,
            estimatedCost: round(packsToBuy * source.pricePerPack, 2),
        };
    });

    lines.sort((a, b) => b.packsToBuy - a.packsToBuy || a.name.localeCompare(b.name));

    return {
        lines,
        totalCost: round(
            lines.reduce((sum, line) => sum + line.estimatedCost, 0),
            2
        ),
    };
};
