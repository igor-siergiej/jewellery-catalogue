import {
    type Bead,
    type Chain,
    type EarHook,
    type Material,
    MaterialType,
    type Wire,
} from '@jewellery-catalogue/types';
import type {
    RequiredBead,
    RequiredChain,
    RequiredEarHook,
    RequiredMaterial,
    RequiredWire,
} from '@jewellery-catalogue/types/src/requiredMaterial';

const BeadPriceCalculator = (requiredBead: RequiredBead, bead: Bead) => {
    const { requiredQuantity } = requiredBead;
    const { pricePerBead } = bead;

    const totalPrice = requiredQuantity * pricePerBead;

    return parseFloat(totalPrice.toFixed(2));
};

const WirePriceCalculator = (requiredWire: RequiredWire, wire: Wire) => {
    const { requiredLength } = requiredWire;
    const { pricePerMeter } = wire;

    const amountInMeters = requiredLength / 100;
    const totalPrice = pricePerMeter * amountInMeters;

    return parseFloat(totalPrice.toFixed(2));
};

const ChainPriceCalculator = (requiredChain: RequiredChain, chain: Chain) => {
    const { requiredLength } = requiredChain;
    const { pricePerMeter } = chain;

    if (!pricePerMeter) {
        return 0;
    }

    const amountInMeters = requiredLength / 100;
    const totalPrice = pricePerMeter * amountInMeters;

    return parseFloat(totalPrice.toFixed(2));
};

const EarHookPriceCalculator = (requiredEarHook: RequiredEarHook, earHook: EarHook) => {
    const { requiredQuantity } = requiredEarHook;
    const { pricePerPiece } = earHook;

    if (!pricePerPiece) {
        return 0;
    }

    const totalPrice = requiredQuantity * pricePerPiece;

    return parseFloat(totalPrice.toFixed(2));
};

export const MaterialPriceResolver = (requiredMaterial: RequiredMaterial, material: Material) => {
    const MaterialPriceCalculatorMap = {
        [MaterialType.BEAD]: BeadPriceCalculator(requiredMaterial as RequiredBead, material as Bead),
        [MaterialType.WIRE]: WirePriceCalculator(requiredMaterial as RequiredWire, material as Wire),
        [MaterialType.CHAIN]: ChainPriceCalculator(requiredMaterial as RequiredChain, material as Chain),
        [MaterialType.EAR_HOOK]: EarHookPriceCalculator(requiredMaterial as RequiredEarHook, material as EarHook),
    };

    if (material.type in MaterialPriceCalculatorMap) {
        return MaterialPriceCalculatorMap[material.type];
    }

    throw new Error(`Unsupported material type!`);
};

export const getTotalMaterialCosts = (
    selectedMaterials: Array<RequiredMaterial>,
    _materials: Array<Material>
): number => {
    const total = selectedMaterials.reduce((acc, requiredMaterial) => {
        const cost = MaterialPriceResolver(requiredMaterial, requiredMaterial);
        return acc + cost;
    }, 0);
    return total;
};
