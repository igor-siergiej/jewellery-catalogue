import { z } from 'zod';
import { MaterialType } from '../material/enum';

export const baseMaterialSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    brand: z.string(),
    purchaseUrl: z.string(),
    materialCode: z.string().optional(),
    type: z.enum(MaterialType),
    dateAdded: z.string().datetime(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
});

export type BaseMaterial = z.infer<typeof baseMaterialSchema>;
