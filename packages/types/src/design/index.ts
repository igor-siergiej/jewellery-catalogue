export type { RequiredMaterial as RequiredMaterialLegacy } from '../requiredMaterial';

import z from 'zod';
import { requiredMaterialSchema } from '../requiredMaterial';

export const designSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    timeRequired: z.string(),
    materials: z.array(requiredMaterialSchema),
    imageId: z.string(),
    price: z.number(),
    description: z.string(),
    totalMaterialCosts: z.number(),
    dateAdded: z.date(),
    totalQuantity: z.number().default(0),
    lowStockThreshold: z.number().int().nonnegative().optional(),
});

export type Design = z.infer<typeof designSchema>;
