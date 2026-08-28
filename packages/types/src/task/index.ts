import { z } from 'zod';

export const taskSubjectEnum = z.enum(['marketing', 'product', 'finance']);
export type TaskSubject = z.infer<typeof taskSubjectEnum>;

export const taskImportanceEnum = z.enum(['low', 'medium', 'high']);
export type TaskImportance = z.infer<typeof taskImportanceEnum>;

export const taskRecurrenceEnum = z.enum(['none', 'daily', 'weekly']);
export type TaskRecurrence = z.infer<typeof taskRecurrenceEnum>;

export const taskStatusEnum = z.enum(['todo', 'in_progress', 'done']);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const taskSchema = z.object({
    id: z.string(),
    userId: z.string(),
    title: z.string().min(1),
    subject: taskSubjectEnum,
    importance: taskImportanceEnum,
    recurrence: taskRecurrenceEnum,
    status: taskStatusEnum,
    dueDate: z.coerce.date().optional(),
    goalId: z.string().optional(),
    favourite: z.boolean().optional(),
    description: z.string().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export type Task = z.infer<typeof taskSchema>;

export const formTaskSchema = z.object({
    title: z.string().min(1),
    subject: taskSubjectEnum,
    importance: taskImportanceEnum,
    recurrence: taskRecurrenceEnum,
    dueDate: z.coerce.date().optional(),
    goalId: z.string().optional(),
    description: z.string().optional(),
});
export type FormTask = z.infer<typeof formTaskSchema>;

export const updateTaskSchema = taskSchema.partial().omit({ id: true, userId: true, createdAt: true });
export type UpdateTask = z.infer<typeof updateTaskSchema>;
