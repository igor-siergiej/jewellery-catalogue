import { BaseMaterial } from '../baseMaterial';
import { BeadKeysEnum, ChainKeysEnum, EarHookKeysEnum, METAL_TYPE, MaterialType, WIRE_TYPE, WireKeysEnum } from './enum';

export type Material = Wire | Bead | Chain | EarHook;

export interface Wire extends BaseMaterial {
    diameter: number;
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    length: number;
    pricePerMeter: number;
}

export interface Bead extends BaseMaterial {
    diameter: number;
    colour: string;
    quantity: number;
    pricePerBead: number;
}

export interface Chain extends BaseMaterial {
    metalType: METAL_TYPE;
    wireType: WIRE_TYPE;
    diameter: number;
    length: number;
    pricePerMeter?: number;
}

export interface EarHook extends BaseMaterial {
    metalType: METAL_TYPE;
    wireType: WIRE_TYPE;
    quantity: number;
    pricePerPiece?: number;
}

export const MaterialKeysMap = {
    [MaterialType.BEAD]: BeadKeysEnum,
    [MaterialType.WIRE]: WireKeysEnum,
    [MaterialType.EAR_HOOK]: EarHookKeysEnum,
    [MaterialType.CHAIN]: ChainKeysEnum
};

export * from './enum';
