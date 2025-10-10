import type { Bead, Chain, EarHook, Wire } from './index';

export enum METAL_TYPE {
    BRASS = 'BRASS',
    COPPER = 'COPPER',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
    GILT = 'GILT',
}

export enum WIRE_TYPE {
    FULL = 'FULL',
    FILLED = 'FILLED',
    PLATED = 'PLATED',
}

export enum MaterialType {
    WIRE = 'WIRE',
    BEAD = 'BEAD',
    CHAIN = 'CHAIN',
    EAR_HOOK = 'EAR_HOOK',
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
    type: 'type',
    userId: 'userId',
    dateAdded: 'dateAdded',
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
    type: 'type',
    userId: 'userId',
    dateAdded: 'dateAdded',
};

export const ChainKeysEnum: { [K in keyof Required<Chain>]: K } = {
    metalType: 'metalType',
    wireType: 'wireType',
    diameter: 'diameter',
    name: 'name',
    brand: 'brand',
    purchaseUrl: 'purchaseUrl',
    type: 'type',
    length: 'length',
    id: 'id',
    userId: 'userId',
    dateAdded: 'dateAdded',
    pricePerMeter: 'pricePerMeter',
};

export const EarHookKeysEnum: { [K in keyof Required<EarHook>]: K } = {
    metalType: 'metalType',
    wireType: 'wireType',
    name: 'name',
    brand: 'brand',
    purchaseUrl: 'purchaseUrl',
    type: 'type',
    quantity: 'quantity',
    id: 'id',
    userId: 'userId',
    dateAdded: 'dateAdded',
    pricePerPiece: 'pricePerPiece',
};
