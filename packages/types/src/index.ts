import { ObjectId } from 'mongodb';

export interface Design {
    _id: ObjectId;
    materials: Array<Material>;
    name: string;
    imageUrl: string;
    timeRequired: string;
    totalMaterialCosts: number;
    suggestedSellingPrice: number;
}

export type Material = Spread<Wire & Bead>;

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

export type Spread<T> = { [Key in keyof T]: T[Key] };
