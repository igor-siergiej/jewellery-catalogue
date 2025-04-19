import { BaseMaterial } from "../baseMaterial";
import { MaterialType, METAL_TYPE, WIRE_TYPE } from "../material";
import { FormBeadKeysEnum, FormWireKeysEnum } from "./enum";

export type FormMaterial = FormBead | FormWire;

export interface FormWire extends BaseFormMaterial {
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    length: number;
}

export interface FormBead extends BaseFormMaterial {
    colour: string;
    quantity: number;
}

export interface BaseFormMaterial extends BaseMaterial {
    pricePerPack: number;
    packs: number;
}

export const FormMaterialKeysMap = {
    [MaterialType.BEAD]: FormBeadKeysEnum,
    [MaterialType.WIRE]: FormWireKeysEnum,
}

export * from './enum';

