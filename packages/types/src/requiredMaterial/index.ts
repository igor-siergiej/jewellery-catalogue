import { z } from 'zod';
import { beadSchema, chainSchema, earHookSchema, wireSchema } from '../material';

const requiredWireSchema = wireSchema.extend({
    requiredLength: z.number(),
});

const requiredBeadSchema = beadSchema.extend({
    requiredQuantity: z.number(),
});

const requiredChainSchema = chainSchema.extend({
    requiredLength: z.number(),
});

const requiredEarHookSchema = earHookSchema.extend({
    requiredQuantity: z.number(),
});

export const requiredMaterialSchema = z.discriminatedUnion('type', [
    requiredWireSchema,
    requiredBeadSchema,
    requiredChainSchema,
    requiredEarHookSchema,
]);

export type RequiredMaterial = z.infer<typeof requiredMaterialSchema>;
export type RequiredWire = z.infer<typeof requiredWireSchema>;
export type RequiredBead = z.infer<typeof requiredBeadSchema>;
export type RequiredChain = z.infer<typeof requiredChainSchema>;
export type RequiredEarHook = z.infer<typeof requiredEarHookSchema>;
