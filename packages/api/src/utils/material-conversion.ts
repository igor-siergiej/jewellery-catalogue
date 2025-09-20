import { Bead, Chain, FormBead, FormChain, FormMaterial, FormWire, MaterialType, Wire } from '@jewellery-catalogue/types';

export const convertFormDataToMaterial = (formMaterial: FormMaterial) => {
    switch (formMaterial.type) {
        case MaterialType.WIRE:
            return convertFormWireToMaterial(formMaterial as FormWire);
        case MaterialType.BEAD:
            return convertFormBeadToMaterial(formMaterial as FormBead);
        case MaterialType.CHAIN:
            return convertFormChainToMaterial(formMaterial as FormChain);
        default:
            throw new Error(`Unsupported material type: ${formMaterial.type}`);
    }
};

export const convertFormWireToMaterial = (formWire: FormWire): Omit<Wire, 'id'> => {
    const totalLength = formWire.packs * formWire.length;
    const totalPrice = formWire.packs * formWire.pricePerPack;
    const pricePerMeter = totalPrice / totalLength;

    return {
        type: formWire.type,
        name: formWire.name,
        brand: formWire.brand,
        purchaseUrl: formWire.purchaseUrl,
        diameter: formWire.diameter,
        wireType: formWire.wireType,
        metalType: formWire.metalType,
        length: formWire.length,
        pricePerMeter
    };
};

export const convertFormBeadToMaterial = (formBead: FormBead): Omit<Bead, 'id'> => {
    const totalQuantity = formBead.packs * formBead.quantity;
    const totalPrice = formBead.packs * formBead.pricePerPack;
    const pricePerBead = totalPrice / totalQuantity;

    return {
        type: formBead.type,
        name: formBead.name,
        brand: formBead.brand,
        purchaseUrl: formBead.purchaseUrl,
        diameter: formBead.diameter,
        colour: formBead.colour,
        quantity: formBead.quantity,
        pricePerBead
    };
};

export const convertFormChainToMaterial = (formChain: FormChain): Omit<Chain, 'id'> => {
    return {
        type: formChain.type,
        name: formChain.name,
        brand: formChain.brand,
        purchaseUrl: formChain.purchaseUrl,
        metalType: formChain.metalType,
        wireType: formChain.wireType,
        diameter: formChain.diameter,
        length: formChain.length
    };
};
