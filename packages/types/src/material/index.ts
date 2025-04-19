import { BaseMaterial } from "../baseMaterial";
import { BeadKeysEnum, METAL_TYPE, MaterialType, WIRE_TYPE, WireKeysEnum } from "./enum";

export type Material = Wire | Bead;

export interface Wire extends BaseMaterial {
    id: string;
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    length: number;
    pricePerMeter: number;
}

export interface Bead extends BaseMaterial {
    id: string;
    colour: string;
    quantity: number;
    pricePerBead: number;
}

export const MaterialKeysMap = {
    [MaterialType.BEAD]: BeadKeysEnum,
    [MaterialType.WIRE]: WireKeysEnum,
};

export * from './enum';
