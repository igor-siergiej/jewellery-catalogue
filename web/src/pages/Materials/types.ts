export type Material = Wire | Bead;

export interface Wire extends BaseMaterialType {
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    pricePerMeter: number;
}

export interface Bead extends BaseMaterialType {
    colour: string;
    pricePerBead: number;
}

export interface BaseMaterialType {
    name: string;
    brand: string;
    quantity: number;
    diameter: number;
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
