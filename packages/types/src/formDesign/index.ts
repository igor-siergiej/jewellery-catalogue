import { z } from 'zod';
import { DesignType } from '../design/enum';
import { requiredMaterialSchema } from '../requiredMaterial';
import { designVariantSchema, variationGroupSchema } from '../variationGroup';

export const formDesignSchema = z
    .object({
        name: z.string().min(1, 'Please enter the design name').trim(),
        timeRequired: z.string().min(1, 'Please enter the time required'),
        materials: z.array(requiredMaterialSchema),
        images: z
            .array(z.union([z.instanceof(File), z.string()]))
            .optional()
            .default([]),
        price: z.number({ message: 'Please enter the price' }).nonnegative('Price must be 0 or greater'),
        description: z.string(),
        totalMaterialCosts: z.number(),
        lowStockThreshold: z.number().int().nonnegative().optional(),
        variationGroups: z.array(variationGroupSchema).optional().default([]),
        variants: z.array(designVariantSchema).optional().default([]),
        designType: z.nativeEnum(DesignType).optional(),
    })
    .superRefine((data, ctx) => {
        const hasSharedMaterials = data.materials.length > 0;
        const hasVariationGroups = data.variationGroups && data.variationGroups.length > 0;
        if (!hasSharedMaterials && !hasVariationGroups) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please add at least one material or variation group',
                path: ['materials'],
            });
        }
    });

export type FormDesign = z.infer<typeof formDesignSchema>;
