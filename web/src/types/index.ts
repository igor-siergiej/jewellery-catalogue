export interface Design {
    material: string;
    price: number;
    name: string;
}

export type Material = Wire | Bead;

export interface Wire extends BaseMaterialType {
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    length: number;
    pricePerMeter: number;
}

export interface Bead extends BaseMaterialType {
    colour: string;
    quantity: number;
    pricePerBead: number;
}

export interface BaseMaterialType {
    name: string;
    brand: string;
    diameter: number;
    purchaseUrl: string;
    type: MaterialType;
    pricePerPack: number;
}

export enum METAL_TYPE {
    BRASS = 'BRASS',
    COPPER = 'COPPER',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
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
