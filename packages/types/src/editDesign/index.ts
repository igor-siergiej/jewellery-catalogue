import { z } from 'zod';

import { requiredMaterialSchema } from '../requiredMaterial';
import { designVariantSchema, variationGroupSchema } from '../variationGroup';

export const editDesignSchema = z.object({
    name: z.string().min(1, 'Please enter the design name').optional(),
    timeRequired: z.string().min(1, 'Please enter the time required').optional(),
    materials: z.array(requiredMaterialSchema).optional(),
    image: z.string().optional(),
    price: z.number().positive('Price must be greater than 0').optional(),
    description: z.string().optional(),
    totalMaterialCosts: z.number().optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    variationGroups: z.array(variationGroupSchema).optional(),
    variants: z.array(designVariantSchema).optional(),
});

export type EditDesign = z.infer<typeof editDesignSchema>;
