import { ObjectId } from 'mongodb';

export interface Catalogue {
    _id: ObjectId;
    designs: Array<Design>;
    materials: Array<Material>;
}

export interface FormDesign {
    materials: Array<Material>;
    name: string;
    description: string;
    timeRequired: string;
    image: FileList;
    totalMaterialCosts: number;
    price: number;
}

export interface FormWire extends Wire {
    amount: number;
}

export interface FormBead extends Bead {
    amount: number;
}

export interface UploadDesign {
    materials: string;
    name: string;
    description: string;
    timeRequired: string;
    image: PersistentFile;
    totalMaterialCosts: number;
    price: number;
}

export interface PersistentFile {
    filepath: string;
    mimetype?: string;
}

export interface Design {
    id: string;
    materials: Array<Material>;
    name: string;
    imageId: string;
    timeRequired: string;
    description: string;
    totalMaterialCosts: number;
    price: number;
}

export interface Material extends Spread<Wire & Bead> {
    id: string;
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

export type Time = `${number}:${number}`;

export interface MakeRequestProps {
    pathname: string;
    method: MethodType;
    operationString: string;
    headers?: Record<string, string>;
    body?: object | FormData;
};

export enum MethodType {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    DELETE = 'DELETE',
};
