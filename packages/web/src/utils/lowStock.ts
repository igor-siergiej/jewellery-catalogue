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

function isLowStockMaterial(material: Material): boolean {
    if (material.lowStockThreshold == null) return false;

    return getCurrentPacks(material) < material.lowStockThreshold;
}

export function isLowStockVariant(design: Design, variant: DesignVariant): boolean {
    const threshold = variant.lowStockThreshold ?? design.lowStockThreshold;

    return threshold != null && variant.totalQuantity < threshold;
}

export function isLowStockDesign(design: Design): boolean {
    if (design.variants?.length) {
        return design.variants.some((v) => isLowStockVariant(design, v));
    }

    if (design.lowStockThreshold == null) return false;

    return design.totalQuantity < design.lowStockThreshold;
}

export function getLowStockMaterials(materials: Material[]): Material[] {
    return materials.filter(isLowStockMaterial);
}
