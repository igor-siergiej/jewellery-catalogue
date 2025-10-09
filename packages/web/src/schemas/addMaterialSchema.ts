import { MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';
import { z } from 'zod';

const URL_REGEX =
    /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/;

// Base schema with common fields
const baseMaterialSchema = z.object({
    name: z.string().min(1, 'Please enter the material name').trim(),
    brand: z.string().min(1, 'Please enter the brand name').trim(),
    purchaseUrl: z.string().min(1, 'Please enter the URL').regex(URL_REGEX, 'Please enter a valid URL'),
    pricePerPack: z.number({ required_error: 'Please enter the price' }).positive('Price must be greater than 0'),
    packs: z
        .number({ required_error: 'Please enter the quantity of packs' })
        .int('Packs must be a whole number')
        .positive('Packs must be greater than 0'),
});

// Wire-specific schema
const wireSchema = baseMaterialSchema.extend({
    type: z.literal(MaterialType.WIRE),
    wireType: z.nativeEnum(WIRE_TYPE, {
        required_error: 'Please select a wire type',
    }),
    metalType: z.nativeEnum(METAL_TYPE, {
        required_error: 'Please select a metal type',
    }),
    diameter: z.number({ required_error: 'Please enter the diameter' }).positive('Diameter must be greater than 0'),
    length: z.number({ required_error: 'Please enter the wire length' }).positive('Length must be greater than 0'),
});

// Bead-specific schema
const beadSchema = baseMaterialSchema.extend({
    type: z.literal(MaterialType.BEAD),
    colour: z.string().optional(),
    diameter: z.number({ required_error: 'Please enter the diameter' }).nonnegative('Diameter must be 0 or greater'),
    quantity: z
        .number({ required_error: 'Please enter a quantity of beads' })
        .int('Quantity must be a whole number')
        .positive('Quantity must be greater than 0'),
});

// Chain-specific schema
const chainSchema = baseMaterialSchema.extend({
    type: z.literal(MaterialType.CHAIN),
    wireType: z.nativeEnum(WIRE_TYPE, {
        required_error: 'Please select a wire type',
    }),
    metalType: z.nativeEnum(METAL_TYPE, {
        required_error: 'Please select a metal type',
    }),
    diameter: z
        .number({ required_error: 'Please enter the chain diameter' })
        .positive('Diameter must be greater than 0'),
    length: z.number({ required_error: 'Please enter the chain length' }).positive('Length must be greater than 0'),
});

// EarHook-specific schema
const earHookSchema = baseMaterialSchema.extend({
    type: z.literal(MaterialType.EAR_HOOK),
    wireType: z.nativeEnum(WIRE_TYPE, {
        required_error: 'Please select a wire type',
    }),
    metalType: z.nativeEnum(METAL_TYPE, {
        required_error: 'Please select a metal type',
    }),
    quantity: z
        .number({ required_error: 'Please enter the quantity' })
        .int('Quantity must be a whole number')
        .positive('Quantity must be greater than 0'),
});

// Discriminated union schema
export const addMaterialSchema = z.discriminatedUnion('type', [wireSchema, beadSchema, chainSchema, earHookSchema]);

// Export type for TypeScript
export type AddMaterialFormData = z.infer<typeof addMaterialSchema>;

// Export individual schemas for use in sub-forms if needed
export { beadSchema, chainSchema, earHookSchema, wireSchema };
