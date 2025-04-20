import { Bead, Wire } from '.';

export enum METAL_TYPE {
    BRASS = 'BRASS',
    COPPER = 'COPPER',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
    GILT = 'GILT'
}

export enum WIRE_TYPE {
    FULL = 'FULL',
    FILLED = 'FILLED',
    PLATED = 'PLATED',
}

export enum MaterialType {
    WIRE = 'WIRE',
    BEAD = 'BEAD',
}

export const WireKeysEnum: { [K in keyof Required<Wire>]: K } = {
    id: 'id',
    wireType: 'wireType',
    metalType: 'metalType',
    length: 'length',
    pricePerMeter: 'pricePerMeter',
    name: 'name',
    brand: 'brand',
    diameter: 'diameter',
    purchaseUrl: 'purchaseUrl',
    type: 'type'
};

export const BeadKeysEnum: { [K in keyof Required<Bead>]: K } = {
    id: 'id',
    colour: 'colour',
    quantity: 'quantity',
    pricePerBead: 'pricePerBead',
    name: 'name',
    brand: 'brand',
    diameter: 'diameter',
    purchaseUrl: 'purchaseUrl',
    type: 'type'
};
