import { METAL_TYPE, MaterialType, WIRE_TYPE } from '../../types';

export type IFormMaterial = IFormBead | IFormWire;

export interface IFormWire extends BaseMaterialType {
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    length: number;
}

export interface IFormBead extends BaseMaterialType {
    colour: string;
    quantity: number;
}

export interface BaseMaterialType {
    name: string;
    brand: string;
    diameter: number;
    purchaseUrl: string;
    type: MaterialType;
    pricePerPack: number;
    packs: number;
}
