import { z } from 'zod';
import { requiredMaterialSchema } from '../requiredMaterial';

export const variationOptionSchema = z.object({
    id: z.string(),
    material: requiredMaterialSchema,
});

export const variationGroupSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    required: z.number().default(0),
    options: z.array(variationOptionSchema),
});

export const designVariantSchema = z.object({
    id: z.string(),
    optionIds: z.array(z.string()),
    name: z.string(),
    totalQuantity: z.number().default(0),
    totalMaterialCosts: z.number(),
    price: z.number(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
});

export type VariationOption = z.infer<typeof variationOptionSchema>;
export type VariationGroup = z.infer<typeof variationGroupSchema>;
export type DesignVariant = z.infer<typeof designVariantSchema>;
