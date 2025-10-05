import { z } from 'zod';

const requiredMaterialSchema = z.object({
    id: z.string().min(1, 'Material ID is required'),
    requiredLength: z.number().optional(),
    requiredQuantity: z.number().optional(),
});

export const addDesignSchema = z.object({
    name: z.string().min(1, 'Please enter the design name').trim(),
    timeRequired: z.string().min(1, 'Please enter the time required'),
    materials: z.array(requiredMaterialSchema).default([]),
    image: z.instanceof(File, { message: 'Please upload an image' }),
    price: z.number({ required_error: 'Please enter the price' }).positive('Price must be greater than 0'),
    description: z.string().optional().default(''),
    totalMaterialCosts: z.number().default(0),
});

export type AddDesignFormData = z.infer<typeof addDesignSchema>;
