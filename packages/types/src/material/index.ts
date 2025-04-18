import { Spread } from "../util";
import { WIRE_TYPE, METAL_TYPE, MaterialType, WireKeysEnum, BeadKeysEnum } from "./enum";

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


export interface FormWire extends Wire {
    amount: number;
}

export interface FormBead extends Bead {
    amount: number;
}

export const MaterialKeysMap = {
    [MaterialType.BEAD]: BeadKeysEnum,
    [MaterialType.WIRE]: WireKeysEnum,
};

export * from './enum';
