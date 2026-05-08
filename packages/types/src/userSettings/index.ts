import { z } from 'zod';

export const userSettingsSchema = z.object({
    userId: z.string(),
    hourlyWage: z.number().nonnegative(),
    profitMargin: z.number().nonnegative(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
