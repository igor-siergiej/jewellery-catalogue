import { z } from 'zod';

export const draftTypeEnum = z.enum(['material', 'design']);
export type DraftType = z.infer<typeof draftTypeEnum>;

export const draftSchema = z.object({
    id: z.string(),
    userId: z.string(),
    type: draftTypeEnum,
    name: z.string(),
    data: z.record(z.string(), z.unknown()),
    imageId: z.string().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export type Draft = z.infer<typeof draftSchema>;
