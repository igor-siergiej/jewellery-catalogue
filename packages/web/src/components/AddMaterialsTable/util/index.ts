import { type Material, MaterialType } from '@jewellery-catalogue/types';
import type {
    RequiredBead,
    RequiredChain,
    RequiredEarHook,
    RequiredWire,
} from '@jewellery-catalogue/types/src/requiredMaterial';

import type { TableMaterial } from '../types';

export const getRequiredMaterial = (material: Material, matchedRow: TableMaterial) => {
    // Spread the entire material (including dateAdded), just add the required field
    const requiredMaterialConverter = {
        [MaterialType.WIRE]: { ...material, requiredLength: matchedRow.required } as RequiredWire,
        [MaterialType.BEAD]: { ...material, requiredQuantity: matchedRow.required } as RequiredBead,
        [MaterialType.CHAIN]: { ...material, requiredLength: matchedRow.required } as RequiredChain,
        [MaterialType.EAR_HOOK]: { ...material, requiredQuantity: matchedRow.required } as RequiredEarHook,
    };

    if (material.type in requiredMaterialConverter) {
        return requiredMaterialConverter[material.type];
    }

    throw new Error('Unrecognised Material type!');
};
