import type { GoalSource, TaskImportance, TaskRecurrence, TaskStatus, TaskSubject } from '@jewellery-catalogue/types';

export const TASK_SUBJECT_LABELS: Record<TaskSubject, string> = {
    marketing: 'Marketing',
    product: 'Product',
    finance: 'Finance',
};

export const TASK_IMPORTANCE_LABELS: Record<TaskImportance, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
};

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
    none: 'Never',
    daily: 'Every day',
    weekly: 'Every week',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    todo: 'To do',
    in_progress: 'In progress',
    done: 'Done',
};

export const GOAL_SOURCE_LABELS: Record<GoalSource, string> = {
    manual: 'Manual entry',
    etsy_active_listings: 'Etsy active listings',
    etsy_sales_count: 'Etsy total sales',
};
