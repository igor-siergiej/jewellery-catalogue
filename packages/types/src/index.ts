import { ObjectId } from 'mongodb';

export interface Catalogue {
    _id: ObjectId;
    designs: Array<Design>;
    materials: Array<Material>;
}

export interface Design {
    _id: ObjectId;
    materials: Array<Material>;
    name: string;
    imageUrl: string;
    timeRequired: string;
    totalMaterialCosts: number;
    suggestedSellingPrice: number;
}

export interface Material extends Spread<Wire & Bead> {
    _id: ObjectId;
}

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

export const WireKeysEnum: { [K in keyof Required<Wire>]: K } = {
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
    colour: 'colour',
    quantity: 'quantity',
    pricePerBead: 'pricePerBead',
    name: 'name',
    brand: 'brand',
    diameter: 'diameter',
    purchaseUrl: 'purchaseUrl',
    type: 'type'
};

export const MaterialKeysMap = {
    [MaterialType.BEAD]: BeadKeysEnum,
    [MaterialType.WIRE]: WireKeysEnum,
};

export type Spread<T> = { [Key in keyof T]: T[Key] };
