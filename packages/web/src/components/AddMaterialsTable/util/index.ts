import {
    type Material,
    MaterialType,
    type RequiredBead,
    type RequiredChain,
    type RequiredEarHook,
    type RequiredWire,
} from '@jewellery-catalogue/types';

import type { TableMaterial } from '../types';

export const getRequiredMaterial = (material: Material, matchedRow: TableMaterial) => {
    const requiredMaterialConverter = {
        [MaterialType.WIRE]: { materialId: material.id, requiredLength: matchedRow.required } as RequiredWire,
        [MaterialType.BEAD]: { materialId: material.id, requiredQuantity: matchedRow.required } as RequiredBead,
        [MaterialType.CHAIN]: { materialId: material.id, requiredLength: matchedRow.required } as RequiredChain,
        [MaterialType.EAR_HOOK]: { materialId: material.id, requiredQuantity: matchedRow.required } as RequiredEarHook,
    };

    if (material.type in requiredMaterialConverter) {
        return requiredMaterialConverter[material.type];
    }

    throw new Error('Unrecognised Material type!');
};
