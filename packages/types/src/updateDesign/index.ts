import { z } from 'zod';

// Base update schema for design
export const updateDesignSchema = z.object({
    name: z.string().min(1, 'Please enter the design name').optional(),
    description: z.string().min(1, 'Please enter the description').optional(),
    timeRequired: z.string().min(1, 'Please enter the time required').optional(),
    price: z.number().positive('Price must be greater than 0').optional(),
    addQuantity: z.number().int().positive('Quantity must be at least 1').optional(),
});

export type UpdateDesign = z.infer<typeof updateDesignSchema>;
