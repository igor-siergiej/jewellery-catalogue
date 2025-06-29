import { Bead, FormBead, FormMaterial, FormWire, FormChain, MaterialType, Wire, Chain } from '@jewellery-catalogue/types';

export const convertFormDataToMaterial = (formMaterial: FormMaterial) => {
    switch (formMaterial.type) {
        case MaterialType.WIRE:
            return convertFormWireToMaterial(formMaterial as FormWire);
        case MaterialType.BEAD:
            return convertFormBeadToMaterial(formMaterial as FormBead);
        case MaterialType.CHAIN:
            return convertFormChainToMaterial(formMaterial as FormChain);
    }
};

export const convertFormWireToMaterial = (formWire: FormWire): Omit<Wire, 'id'> => {
    const totalLength = formWire.packs * formWire.length;
    const totalPrice = formWire.packs * formWire.pricePerPack;
    const pricePerMeter = totalPrice / totalLength;

    const { packs, pricePerPack, ...rest } = formWire;

    return { ...rest, pricePerMeter };
};

export const convertFormBeadToMaterial = (formBead: FormBead): Omit<Bead, 'id'> => {
    const totalQuantity = formBead.packs * formBead.quantity;
    const totalPrice = formBead.packs * formBead.pricePerPack;
    const pricePerBead = totalPrice / totalQuantity;

    const { packs, pricePerPack, ...rest } = formBead;

    return { ...rest, pricePerBead };
};

export const convertFormChainToMaterial = (formChain: FormChain): Omit<Chain, 'id'> => {
    const { packs, pricePerPack, ...rest } = formChain;
    return { ...rest };
};
