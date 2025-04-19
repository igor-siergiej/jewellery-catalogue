import { Material, MaterialType, RequiredBead, RequiredWire } from "@jewellery-catalogue/types";
import { TableMaterial } from "../types";

export const getRequiredMaterial = (material: Material, matchedRow: TableMaterial) => {
    const requiredMaterialConverter = {
        [MaterialType.WIRE]: { id: material.id, requiredLength: matchedRow.required } as RequiredWire,
        [MaterialType.BEAD]: { id: material.id, requiredQuantity: matchedRow.required } as RequiredBead
    }

    if (material.type in requiredMaterialConverter) {
        return requiredMaterialConverter[material.type];
    }

    throw new Error('Unrecognised Material type!')
}
