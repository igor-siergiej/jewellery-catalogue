import { z } from 'zod';
import { requiredMaterialSchema } from '../requiredMaterial';

export const formDesignSchema = z.object({
    name: z.string().min(1, 'Please enter the design name').trim(),
    timeRequired: z.string().min(1, 'Please enter the time required'),
    materials: z.array(requiredMaterialSchema).min(1, 'Please add at least one material'),
    image: z.union([z.instanceof(File), z.string()], { message: 'Please upload an image' }).optional(),
    price: z.number({ message: 'Please enter the price' }).positive('Price must be greater than 0'),
    description: z.string(),
    totalMaterialCosts: z.number(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
});

export type FormDesign = z.infer<typeof formDesignSchema>;
