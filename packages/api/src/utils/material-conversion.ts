import {
    type Bead,
    type Chain,
    type FormBead,
    type FormChain,
    type FormMaterial,
    type FormWire,
    MaterialType,
    type Wire,
} from '@jewellery-catalogue/types';

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

type MissingMaterialFields = 'id' | 'dateAdded' | 'userId';

export const convertFormWireToMaterial = (formWire: FormWire): Omit<Wire, MissingMaterialFields> => {
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
        pricePerMeter,
    };
};

export const convertFormBeadToMaterial = (formBead: FormBead): Omit<Bead, MissingMaterialFields> => {
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
        pricePerBead,
    };
};

export const convertFormChainToMaterial = (formChain: FormChain): Omit<Chain, MissingMaterialFields> => {
    return {
        type: formChain.type,
        name: formChain.name,
        brand: formChain.brand,
        purchaseUrl: formChain.purchaseUrl,
        metalType: formChain.metalType,
        wireType: formChain.wireType,
        diameter: formChain.diameter,
        length: formChain.length,
    };
};
