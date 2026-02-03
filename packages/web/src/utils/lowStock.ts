import { type Design, type Material, MaterialType } from '@jewellery-catalogue/types';

/**
 * Calculate the current number of packs for a material
 */
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

/**
 * Check if a material is below its low stock threshold
 */
export function isLowStockMaterial(material: Material): boolean {
    if (material.lowStockThreshold === undefined || material.lowStockThreshold === null) {
        return false;
    }
    const currentPacks = getCurrentPacks(material);
    return currentPacks < material.lowStockThreshold;
}

/**
 * Check if a design is below its low stock threshold
 */
export function isLowStockDesign(design: Design): boolean {
    if (design.lowStockThreshold === undefined || design.lowStockThreshold === null) {
        return false;
    }
    return design.totalQuantity < design.lowStockThreshold;
}

/**
 * Filter materials to get only those below low stock threshold
 */
export function getLowStockMaterials(materials: Material[]): Material[] {
    return materials.filter(isLowStockMaterial);
}

/**
 * Filter designs to get only those below low stock threshold
 */
export function getLowStockDesigns(designs: Design[]): Design[] {
    return designs.filter(isLowStockDesign);
}

/**
 * Get current packs for a material (exposed for use in components)
 */
export function getMaterialCurrentPacks(material: Material): number {
    return getCurrentPacks(material);
}
