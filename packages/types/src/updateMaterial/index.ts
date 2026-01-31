import { z } from 'zod';
import { MaterialType, METAL_TYPE, WIRE_TYPE } from '../material/enum';

// Base update schema for common fields
const baseUpdateMaterialSchema = z.object({
    name: z.string().min(1, 'Please enter the material name').optional(),
    brand: z.string().min(1, 'Please enter the brand').optional(),
    purchaseUrl: z.string().url('Please enter a valid URL').optional(),
    materialCode: z.string().optional(),
    pricePerPack: z
        .number({ message: 'Please enter the price per pack' })
        .positive('Price must be greater than 0')
        .optional(),
    addPacks: z.number().int().positive('Number of packs must be at least 1').optional(),
});

// Wire update schema
export const updateWireSchema = baseUpdateMaterialSchema.extend({
    type: z.literal(MaterialType.WIRE),
    diameter: z.number({ message: 'Please enter the diameter' }).positive('Diameter must be greater than 0').optional(),
    wireType: z.enum(WIRE_TYPE).optional(),
    metalType: z.enum(METAL_TYPE).optional(),
    lengthPerPack: z
        .number({ message: 'Please enter the length per pack' })
        .positive('Length must be greater than 0')
        .optional(),
    totalLength: z
        .number({ message: 'Please enter the total length' })
        .positive('Total length must be greater than 0')
        .optional(),
});

// Bead update schema
export const updateBeadSchema = baseUpdateMaterialSchema.extend({
    type: z.literal(MaterialType.BEAD),
    diameter: z.number({ message: 'Please enter the diameter' }).positive('Diameter must be greater than 0').optional(),
    colour: z.string().min(1, 'Please enter the colour').optional(),
    quantityPerPack: z
        .number({ message: 'Please enter the quantity per pack' })
        .int()
        .positive('Quantity must be at least 1')
        .optional(),
    totalQuantity: z
        .number({ message: 'Please enter the total quantity' })
        .int()
        .positive('Total quantity must be at least 1')
        .optional(),
});

// Chain update schema
export const updateChainSchema = baseUpdateMaterialSchema.extend({
    type: z.literal(MaterialType.CHAIN),
    metalType: z.enum(METAL_TYPE).optional(),
    wireType: z.enum(WIRE_TYPE).optional(),
    diameter: z.number({ message: 'Please enter the diameter' }).positive('Diameter must be greater than 0').optional(),
    lengthPerPack: z
        .number({ message: 'Please enter the length per pack' })
        .positive('Length must be greater than 0')
        .optional(),
    totalLength: z
        .number({ message: 'Please enter the total length' })
        .positive('Total length must be greater than 0')
        .optional(),
});

// Ear Hook update schema
export const updateEarHookSchema = baseUpdateMaterialSchema.extend({
    type: z.literal(MaterialType.EAR_HOOK),
    metalType: z.enum(METAL_TYPE).optional(),
    wireType: z.enum(WIRE_TYPE).optional(),
    quantityPerPack: z
        .number({ message: 'Please enter the quantity per pack' })
        .int()
        .positive('Quantity must be at least 1')
        .optional(),
    totalQuantity: z
        .number({ message: 'Please enter the total quantity' })
        .int()
        .positive('Total quantity must be at least 1')
        .optional(),
});

// Discriminated union for all update types
export const updateMaterialSchema = z.discriminatedUnion('type', [
    updateWireSchema,
    updateBeadSchema,
    updateChainSchema,
    updateEarHookSchema,
]);

export type UpdateWire = z.infer<typeof updateWireSchema>;
export type UpdateBead = z.infer<typeof updateBeadSchema>;
export type UpdateChain = z.infer<typeof updateChainSchema>;
export type UpdateEarHook = z.infer<typeof updateEarHookSchema>;

export type UpdateMaterial = z.infer<typeof updateMaterialSchema>;

export const UpdateMaterialSchemas = {
    [MaterialType.BEAD]: updateBeadSchema,
    [MaterialType.WIRE]: updateWireSchema,
    [MaterialType.EAR_HOOK]: updateEarHookSchema,
    [MaterialType.CHAIN]: updateChainSchema,
};
