import { Bead, Material, MaterialType, Wire } from '@jewellery-catalogue/types';
import { RequiredBead, RequiredMaterial, RequiredWire } from '@jewellery-catalogue/types/src/requiredMaterial';

const BeadPriceCalculator = (requiredBead: RequiredBead, bead: Bead) => {
    const { requiredQuantity } = requiredBead;
    const { pricePerBead } = bead;

    const totalPrice = requiredQuantity * pricePerBead;

    return parseFloat(totalPrice.toFixed(2));
};

const WirePriceCalculator = (requiredWire: RequiredWire, wire: Wire) => {
    const { requiredLength } = requiredWire;
    const { pricePerMeter } = wire;

    const amountInMeters = requiredLength / 10;
    const totalPrice = pricePerMeter * amountInMeters;

    return parseFloat(totalPrice.toFixed(2));
};

export const MaterialPriceResolver = (requiredMaterial: RequiredMaterial, material: Material) => {
    const MaterialPriceCalculatorMap = {
        [MaterialType.BEAD]: BeadPriceCalculator(requiredMaterial as RequiredBead, material as Bead),
        [MaterialType.WIRE]: WirePriceCalculator(requiredMaterial as RequiredWire, material as Wire),
    };

    if (material.type in MaterialPriceCalculatorMap) {
        return MaterialPriceCalculatorMap[material.type];
    }

    throw new Error(`Unsupported material type!`);
};

export const getTotalMaterialCosts = (selectedMaterials: Array<RequiredMaterial>, materials: Array<Material>): number => {
    const matchedMaterials = selectedMaterials.reduce<Array<{ selectedMaterial: RequiredMaterial; material: Material }>>((acc, requiredMaterial) => {
        const match = materials.find(searchMaterial => searchMaterial.id === requiredMaterial.id);
        if (match) {
            acc.push({ selectedMaterial: requiredMaterial, material: match });
        }
        return acc;
    }, []);

    return matchedMaterials.reduce((acc, { selectedMaterial, material }) => {
        return acc + MaterialPriceResolver(selectedMaterial, material);
    }, 0);
};
