import { FormBead, FormWire, Material, MaterialType } from '@jewellery-catalogue/types';

const BeadPriceCalculator = (bead: FormBead) => {
    const { quantity, pricePerBead } = bead;

    const totalPrice = quantity * pricePerBead;

    return parseFloat(totalPrice.toFixed(2));
};

const WirePriceCalculator = (wire: FormWire) => {
    const { amount, pricePerMeter } = wire;

    const amountInMeters = amount / 10;
    const totalPrice = pricePerMeter * amountInMeters;

    return parseFloat(totalPrice.toFixed(2));
};
export const MaterialPriceCalculatorMap = {
    [MaterialType.BEAD]: BeadPriceCalculator,
    [MaterialType.WIRE]: WirePriceCalculator,
};

export const MaterialPriceResolver = (material: Material) => {
    if (material.type in MaterialPriceCalculatorMap) {
        return MaterialPriceCalculatorMap[material.type];
    }

    throw new Error('Unsupported material, cannot get price');
};

export const getTotalMaterialCosts = (materials: Array<Material>): number => {
    // TODO: reducer here to add up all materials
    return materials.reduce((acc, material) => {
        const calculator = MaterialPriceResolver(material);

        const priceOfMaterial = calculator(material as unknown as FormBead & FormWire);
        console.log(priceOfMaterial);
        return acc + priceOfMaterial;
    }, 0);
};
