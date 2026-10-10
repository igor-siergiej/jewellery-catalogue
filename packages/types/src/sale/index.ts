import { z } from 'zod';

// pending: matched to a design, stock not yet decremented.
// applied: stock decremented. unmatched: no linked design/variant, so stock was left alone.
export const saleStatusEnum = z.enum(['pending', 'applied', 'unmatched']);
export type SaleStatus = z.infer<typeof saleStatusEnum>;

export const saleSchema = z.object({
    userId: z.string(),
    designId: z.string().nullable(),
    variantId: z.string().nullable(),
    listingId: z.number(),
    receiptId: z.number(),
    transactionId: z.number(),
    title: z.string(),
    variationLabel: z.string().optional(),
    quantity: z.number().int().positive(),
    price: z.number(),
    soldAt: z.number(), // epoch ms
    status: saleStatusEnum,
});
export type Sale = z.infer<typeof saleSchema>;
