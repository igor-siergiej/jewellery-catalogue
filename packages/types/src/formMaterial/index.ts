import { z } from 'zod';
import type { BaseMaterial } from '../baseMaterial/index';
import { MaterialType, METAL_TYPE, type WIRE_TYPE, WIRE_TYPE as WIRE_TYPE_ARRAY } from '../material/enum';
import { FormBeadKeysEnum, FormChainKeysEnum, FormWireKeysEnum } from './enum';

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

// Base form material schema (without id, userId, dateAdded - those are server-generated)
const baseFormMaterialSchema = z.object({
    name: z.string().min(1, 'Please enter the material name'),
    brand: z.string().min(1, 'Please enter the brand'),
    purchaseUrl: z.string().url('Please enter a valid URL'),
    pricePerPack: z.number({ message: 'Please enter the price per pack' }).positive('Price must be greater than 0'),
    packs: z
        .number({ message: 'Please enter the number of packs' })
        .int()
        .positive('Number of packs must be at least 1'),
});

export const formWireSchema = baseFormMaterialSchema.extend({
    type: z.literal(MaterialType.WIRE),
    diameter: z.number({ message: 'Please enter the diameter' }).positive('Diameter must be greater than 0'),
    wireType: z.enum(WIRE_TYPE_ARRAY),
    metalType: z.enum(METAL_TYPE),
    length: z.number({ message: 'Please enter the length' }).positive('Length must be greater than 0'),
});

export const formBeadSchema = baseFormMaterialSchema.extend({
    type: z.literal(MaterialType.BEAD),
    diameter: z.number({ message: 'Please enter the diameter' }).positive('Diameter must be greater than 0'),
    colour: z.string().min(1, 'Please enter the colour'),
    quantity: z.number({ message: 'Please enter the quantity' }).int().positive('Quantity must be at least 1'),
});

export const formChainSchema = baseFormMaterialSchema.extend({
    type: z.literal(MaterialType.CHAIN),
    metalType: z.enum(METAL_TYPE),
    wireType: z.enum(WIRE_TYPE_ARRAY),
    diameter: z.number({ message: 'Please enter the diameter' }).positive('Diameter must be greater than 0'),
    length: z.number({ message: 'Please enter the length' }).positive('Length must be greater than 0'),
});

export const formEarHookSchema = baseFormMaterialSchema.extend({
    type: z.literal(MaterialType.EAR_HOOK),
    metalType: z.enum(METAL_TYPE),
    wireType: z.enum(WIRE_TYPE_ARRAY),
    quantity: z.number({ message: 'Please enter the quantity' }).int().positive('Quantity must be at least 1'),
});

export const formMaterialSchema = z.discriminatedUnion('type', [
    formWireSchema,
    formBeadSchema,
    formChainSchema,
    formEarHookSchema,
]);
