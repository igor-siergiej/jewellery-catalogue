import { type Design, type DesignVariant, type Material, MaterialType } from '@jewellery-catalogue/types';

function getCurrentPacks(material: Material): number {
    switch (material.type) {
        case MaterialType.WIRE:
        case MaterialType.CHAIN:
            return Math.floor(material.totalLength / material.lengthPerPack);
        case MaterialType.BEAD:
        case MaterialType.EAR_HOOK:
            return Math.floor(material.totalQuantity / material.quantityPerPack);
        default:
            return 0;
    }
}

export function isLowStockMaterial(material: Material): boolean {
    if (material.lowStockThreshold == null) return false;
    return getCurrentPacks(material) < material.lowStockThreshold;
}

export function isLowStockDesign(design: Design): boolean {
    if (design.variants?.length) {
        return design.variants.some((v) => v.lowStockThreshold != null && v.totalQuantity < v.lowStockThreshold);
    }
    if (design.lowStockThreshold == null) return false;
    return design.totalQuantity < design.lowStockThreshold;
}

export type LowStockDesignRow = {
    design: Design;
    variant?: DesignVariant;
};

export function getLowStockDesignRows(designs: Design[]): LowStockDesignRow[] {
    const rows: LowStockDesignRow[] = [];
    for (const design of designs) {
        if (design.variants?.length) {
            for (const variant of design.variants) {
                if (variant.lowStockThreshold != null && variant.totalQuantity < variant.lowStockThreshold) {
                    rows.push({ design, variant });
                }
            }
        } else if (isLowStockDesign(design)) {
            rows.push({ design });
        }
    }
    return rows;
}

export function getLowStockMaterials(materials: Material[]): Material[] {
    return materials.filter(isLowStockMaterial);
}

export function getMaterialCurrentPacks(material: Material): number {
    return getCurrentPacks(material);
}
