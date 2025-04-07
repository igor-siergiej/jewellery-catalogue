import { Bead, MaterialType, Wire } from '@jewellery-catalogue/types';
import { IFormBead, IFormMaterial, IFormWire } from '../types';

// TODO: this should be in top level utils
export const convertFormDataToMaterial = (formMaterial: IFormMaterial) => {
    switch (formMaterial.type) {
        case MaterialType.WIRE:
            return convertFormWireToMaterial(formMaterial as IFormWire);
        case MaterialType.BEAD:
            return convertFormBeadToMaterial(formMaterial as IFormBead);
    }
};

export const convertFormWireToMaterial = (formWire: IFormWire): Wire => {
    const totalLength = formWire.packs * formWire.length;
    const totalPrice = formWire.packs * formWire.pricePerPack;
    const pricePerMeter = totalPrice / totalLength;

    const { packs, pricePerPack, ...rest } = formWire;

    const wire: Wire = { ...rest, pricePerMeter };

    return wire;
};

export const convertFormBeadToMaterial = (formBead: IFormBead): Bead => {
    const totalQuantity = formBead.packs * formBead.quantity;
    const totalPrice = formBead.packs * formBead.pricePerPack;
    const pricePerBead = totalPrice / totalQuantity;

    const { packs, pricePerPack, ...rest } = formBead;

    const bead: Bead = { ...rest, pricePerBead };

    return bead;
};
