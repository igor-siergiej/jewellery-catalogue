import { z } from 'zod';
import { MaterialType, METAL_TYPE, WIRE_TYPE } from '../material/enum';

export type FormMaterial = z.infer<typeof formMaterialSchema>;

export type FormWire = z.infer<typeof formWireSchema>;
export type FormBead = z.infer<typeof formBeadSchema>;
export type FormChain = z.infer<typeof formChainSchema>;
export type FormEarHook = z.infer<typeof formEarHookSchema>;

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
    wireType: z.enum(WIRE_TYPE),
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
    wireType: z.enum(WIRE_TYPE),
    diameter: z.number({ message: 'Please enter the diameter' }).positive('Diameter must be greater than 0'),
    length: z.number({ message: 'Please enter the length' }).positive('Length must be greater than 0'),
});

export const formEarHookSchema = baseFormMaterialSchema.extend({
    type: z.literal(MaterialType.EAR_HOOK),
    metalType: z.enum(METAL_TYPE),
    wireType: z.enum(WIRE_TYPE),
    quantity: z.number({ message: 'Please enter the quantity' }).int().positive('Quantity must be at least 1'),
});

export const formMaterialSchema = z.discriminatedUnion('type', [
    formWireSchema,
    formBeadSchema,
    formChainSchema,
    formEarHookSchema,
]);

export const FormMaterialSchemas = {
    [MaterialType.BEAD]: formBeadSchema,
    [MaterialType.WIRE]: formWireSchema,
    [MaterialType.EAR_HOOK]: formEarHookSchema,
    [MaterialType.CHAIN]: formChainSchema,
};
