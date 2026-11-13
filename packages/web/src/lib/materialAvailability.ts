import type { Material, RequiredMaterial } from '@jewellery-catalogue/types';
import { MaterialType } from '@jewellery-catalogue/types';

export interface MaterialAvailability {
    material: Material;
    required: number;
    available: number;
    canMake: number;
    unit: string;
    missing: boolean;
}

export const formatAmount = (value: number): string => String(Number(value.toFixed(2)));

/** How much of a material one design needs against what is in stock. Wire and chain are measured in metres. */
export function getMaterialAvailability(
    requiredMaterial: RequiredMaterial,
    allMaterials: Material[]
): MaterialAvailability {
    const material = allMaterials.find((m) => m.id === requiredMaterial.id);

    if (!material) {
        return {
            material: requiredMaterial as Material,
            required: 0,
            available: 0,
            canMake: 0,
            unit: '',
            missing: true,
        };
    }

    let required = 0;
    let available = 0;
    let unit = '';

    switch (material.type) {
        case MaterialType.WIRE:
        case MaterialType.CHAIN:
            required = (requiredMaterial as any).requiredLength / 100;
            available = (material as any).totalLength;
            unit = 'm';
            break;
        case MaterialType.BEAD:
        case MaterialType.EAR_HOOK:
            required = (requiredMaterial as any).requiredQuantity;
            available = (material as any).totalQuantity;
            unit = 'pcs';
            break;
    }

    return {
        material,
        required,
        available,
        canMake: required > 0 ? Math.floor(available / required) : 0,
        unit,
        missing: false,
    };
}

/** "Enough" or "Short by N unit", checked against the quantity being produced (one design when none is entered). */
export function describeAvailability({
    required,
    available,
    unit,
    quantity,
}: {
    required: number;
    available: number;
    unit: string;
    quantity: number;
}): string {
    const needed = required * Math.max(quantity, 1);

    if (available >= needed) return 'Enough';

    return `Short by ${formatAmount(needed - available)} ${unit}`.trim();
}
