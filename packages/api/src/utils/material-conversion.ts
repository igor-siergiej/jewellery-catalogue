import {
    type Bead,
    type Chain,
    type EarHook,
    type FormBead,
    type FormChain,
    type FormEarHook,
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
        case MaterialType.EAR_HOOK:
            return convertFormEarHookToMaterial(formMaterial as FormEarHook);
        default:
            throw new Error(`Unsupported material type: ${formMaterial.type}`);
    }
};

type MissingMaterialFields = 'id' | 'dateAdded' | 'userId';

export const convertFormWireToMaterial = (formWire: FormWire): Omit<Wire, MissingMaterialFields> => {
    const totalLength = formWire.packs * formWire.length;
    const totalPrice = formWire.packs * formWire.pricePerPack;
    const pricePerMeter = totalPrice / totalLength;

    const result: any = {
        type: formWire.type,
        name: formWire.name,
        brand: formWire.brand,
        purchaseUrl: formWire.purchaseUrl,
        diameter: formWire.diameter,
        wireType: formWire.wireType,
        metalType: formWire.metalType,
        lengthPerPack: formWire.length,
        pricePerPack: formWire.pricePerPack,
        totalLength,
        pricePerMeter,
    };

    if (formWire.materialCode?.trim()) {
        result.materialCode = formWire.materialCode.trim();
    }

    return result;
};

export const convertFormBeadToMaterial = (formBead: FormBead): Omit<Bead, MissingMaterialFields> => {
    const totalQuantity = formBead.packs * formBead.quantity;
    const totalPrice = formBead.packs * formBead.pricePerPack;
    const pricePerBead = totalPrice / totalQuantity;

    const result: any = {
        type: formBead.type,
        name: formBead.name,
        brand: formBead.brand,
        purchaseUrl: formBead.purchaseUrl,
        diameter: formBead.diameter,
        colour: formBead.colour,
        quantityPerPack: formBead.quantity,
        pricePerPack: formBead.pricePerPack,
        totalQuantity,
        pricePerBead,
    };

    if (formBead.materialCode?.trim()) {
        result.materialCode = formBead.materialCode.trim();
    }

    return result;
};

export const convertFormChainToMaterial = (formChain: FormChain): Omit<Chain, MissingMaterialFields> => {
    const totalLength = formChain.packs * formChain.length;
    const totalPrice = formChain.packs * formChain.pricePerPack;
    const pricePerMeter = totalLength > 0 ? totalPrice / totalLength : undefined;

    const result: any = {
        type: formChain.type,
        name: formChain.name,
        brand: formChain.brand,
        purchaseUrl: formChain.purchaseUrl,
        metalType: formChain.metalType,
        wireType: formChain.wireType,
        diameter: formChain.diameter,
        lengthPerPack: formChain.length,
        pricePerPack: formChain.pricePerPack,
        totalLength,
        pricePerMeter,
    };

    if (formChain.materialCode?.trim()) {
        result.materialCode = formChain.materialCode.trim();
    }

    return result;
};

export const convertFormEarHookToMaterial = (formEarHook: FormEarHook): Omit<EarHook, MissingMaterialFields> => {
    const totalQuantity = formEarHook.packs * formEarHook.quantity;
    const totalPrice = formEarHook.packs * formEarHook.pricePerPack;
    const pricePerPiece = totalQuantity > 0 ? totalPrice / totalQuantity : undefined;

    const result: any = {
        type: formEarHook.type,
        name: formEarHook.name,
        brand: formEarHook.brand,
        purchaseUrl: formEarHook.purchaseUrl,
        metalType: formEarHook.metalType,
        wireType: formEarHook.wireType,
        quantityPerPack: formEarHook.quantity,
        pricePerPack: formEarHook.pricePerPack,
        totalQuantity,
        pricePerPiece,
    };

    if (formEarHook.materialCode?.trim()) {
        result.materialCode = formEarHook.materialCode.trim();
    }

    return result;
};
