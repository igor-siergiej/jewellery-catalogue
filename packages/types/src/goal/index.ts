import { z } from 'zod';

export const goalSourceEnum = z.enum(['manual', 'etsy_active_listings', 'etsy_sales_count']);
export type GoalSource = z.infer<typeof goalSourceEnum>;

export const goalSchema = z.object({
    id: z.string(),
    userId: z.string(),
    title: z.string().min(1),
    targetValue: z.number().positive(),
    currentValue: z.number().nonnegative(),
    unit: z.string().optional(),
    source: goalSourceEnum,
    targetDate: z.coerce.date().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export type Goal = z.infer<typeof goalSchema>;

export const formGoalSchema = z.object({
    title: z.string().min(1),
    targetValue: z.number().positive(),
    currentValue: z.number().nonnegative().default(0),
    unit: z.string().optional(),
    source: goalSourceEnum.default('manual'),
    targetDate: z.coerce.date().optional(),
});
export type FormGoal = z.infer<typeof formGoalSchema>;

export const updateGoalSchema = goalSchema.partial().omit({ id: true, userId: true, createdAt: true });
export type UpdateGoal = z.infer<typeof updateGoalSchema>;
