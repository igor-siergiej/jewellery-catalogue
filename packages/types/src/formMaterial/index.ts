import { BaseMaterial } from '../baseMaterial';
import { MaterialType, METAL_TYPE, WIRE_TYPE } from '../material';
import { FormBeadKeysEnum, FormWireKeysEnum, FormChainKeysEnum } from './enum';

export type FormMaterial = FormBead | FormWire | FormChain;

export interface FormWire extends BaseFormMaterial {
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    length: number;
    diameter: number;
}

export interface FormBead extends BaseFormMaterial {
    colour: string;
    quantity: number;
    diameter: number;
}

export interface FormEarHook extends BaseFormMaterial {
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    quantity: number;
}

export interface FormChain extends BaseFormMaterial {
    wireType: WIRE_TYPE;
    metalType: METAL_TYPE;
    diameter: number;
    length: number;
}

export interface BaseFormMaterial extends BaseMaterial {
    pricePerPack: number;
    packs: number;
}

export const FormMaterialKeysMap = {
    [MaterialType.BEAD]: FormBeadKeysEnum,
    [MaterialType.WIRE]: FormWireKeysEnum,
    [MaterialType.CHAIN]: FormChainKeysEnum,
};

export * from './enum';
