import { METAL_TYPE, MaterialType, WIRE_TYPE } from '../../types';

export type IFormMaterial = IFormBead | IFormWire;

export interface IFormWire extends BaseFormMaterialType {
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    length: number;
}

export interface IFormBead extends BaseFormMaterialType {
    colour: string;
    quantity: number;
}

export interface BaseFormMaterialType {
    name: string;
    brand: string;
    diameter: number;
    purchaseUrl: string;
    type: MaterialType;
    pricePerPack: number;
    packs: number;
}
