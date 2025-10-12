import { z } from 'zod';
import { baseMaterialSchema } from '../baseMaterial';
import { MaterialType, METAL_TYPE, WIRE_TYPE } from './enum';

export const wireSchema = baseMaterialSchema.extend({
    type: z.literal(MaterialType.WIRE),
    diameter: z.number(),
    wireType: z.enum(WIRE_TYPE),
    metalType: z.enum(METAL_TYPE),
    length: z.number(),
    pricePerMeter: z.number(),
});

export const beadSchema = baseMaterialSchema.extend({
    type: z.literal(MaterialType.BEAD),
    diameter: z.number(),
    colour: z.string(),
    quantity: z.number(),
    pricePerBead: z.number(),
});

export const chainSchema = baseMaterialSchema.extend({
    type: z.literal(MaterialType.CHAIN),
    metalType: z.enum(METAL_TYPE),
    wireType: z.enum(WIRE_TYPE),
    diameter: z.number(),
    length: z.number(),
    pricePerMeter: z.number().optional(),
});

export const earHookSchema = baseMaterialSchema.extend({
    type: z.literal(MaterialType.EAR_HOOK),
    metalType: z.enum(METAL_TYPE),
    wireType: z.enum(WIRE_TYPE),
    quantity: z.number(),
    pricePerPiece: z.number().optional(),
});

export const materialSchema = z.discriminatedUnion('type', [wireSchema, beadSchema, chainSchema, earHookSchema]);

export type Wire = z.infer<typeof wireSchema>;
export type Bead = z.infer<typeof beadSchema>;
export type Chain = z.infer<typeof chainSchema>;
export type EarHook = z.infer<typeof earHookSchema>;

export type Material = z.infer<typeof materialSchema>;
