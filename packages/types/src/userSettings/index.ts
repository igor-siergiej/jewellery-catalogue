import { z } from 'zod';

export const userSettingsSchema = z.object({
    userId: z.string(),
    hourlyWage: z.number().nonnegative(),
    profitMargin: z.number().nonnegative(),
    markupMultiplier: z.number().nonnegative(),
    hourlyRate: z.number().nonnegative(),
    etsyDescriptionTemplate: z.string(),
    etsyTaxonomyMap: z.record(z.string(), z.number()),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
