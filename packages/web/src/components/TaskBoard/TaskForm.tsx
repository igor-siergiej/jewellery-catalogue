import {
    type Task,
    type TaskChecklistItem,
    type TaskImportance,
    type TaskRecurrence,
    type TaskSubject,
    taskImportanceEnum,
    taskRecurrenceEnum,
    taskSubjectEnum,
} from '@jewellery-catalogue/types';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TASK_IMPORTANCE_LABELS, TASK_RECURRENCE_LABELS, TASK_SUBJECT_LABELS } from '@/lib/boardLabels';

import ChecklistEditor from './ChecklistEditor';

export interface TaskFormValues {
    title: string;
    subject: TaskSubject;
    importance: TaskImportance;
    recurrence: TaskRecurrence;
    dueDate: Date | undefined;
    description: string;
    checklist: Array<TaskChecklistItem>;
}

export const EMPTY_TASK_VALUES: TaskFormValues = {
    title: '',
    subject: 'product',
    importance: 'medium',
    recurrence: 'none',
    dueDate: undefined,
    description: '',
    checklist: [],
};

export const taskToFormValues = (task: Task): TaskFormValues => ({
    title: task.title,
    subject: task.subject,
    importance: task.importance,
    recurrence: task.recurrence,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    description: task.description ?? '',
    checklist: task.checklist ?? [],
});

export const canSubmitTask = (values: TaskFormValues) => !!values.title.trim();

const Field = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        {children}
    </div>
);

/** The task fields shared by the Add task and Edit task dialogs. The dialog owns the values and the submit. */
const TaskForm: React.FC<{
    formId: string;
    values: TaskFormValues;
    onChange: (values: TaskFormValues) => void;
    onSubmit: () => void;
}> = ({ formId, values, onChange, onSubmit }) => {
    const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
        onChange({ ...values, [key]: value });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field id={`${formId}-title`} label="Title">
                <Input
                    id={`${formId}-title`}
                    required
                    placeholder="What needs doing"
                    value={values.title}
                    onChange={(e) => set('title', e.target.value)}
                />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field id={`${formId}-subject`} label="Subject">
                    <Select value={values.subject} onValueChange={(v) => set('subject', v as TaskSubject)}>
                        <SelectTrigger id={`${formId}-subject`} className="min-h-11 md:min-h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {taskSubjectEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {TASK_SUBJECT_LABELS[opt]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field id={`${formId}-importance`} label="Importance">
                    <Select value={values.importance} onValueChange={(v) => set('importance', v as TaskImportance)}>
                        <SelectTrigger id={`${formId}-importance`} className="min-h-11 md:min-h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {taskImportanceEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {TASK_IMPORTANCE_LABELS[opt]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field id={`${formId}-recurrence`} label="Repeats">
                    <Select value={values.recurrence} onValueChange={(v) => set('recurrence', v as TaskRecurrence)}>
                        <SelectTrigger id={`${formId}-recurrence`} className="min-h-11 md:min-h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {taskRecurrenceEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {TASK_RECURRENCE_LABELS[opt]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </div>

            <Field id={`${formId}-due`} label="Due date">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id={`${formId}-due`}
                            type="button"
                            variant="outline"
                            className="min-h-11 w-full justify-start font-normal md:min-h-9"
                        >
                            {values.dueDate ? values.dueDate.toLocaleDateString() : 'Optional'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={values.dueDate} onSelect={(d) => set('dueDate', d)} />
                    </PopoverContent>
                </Popover>
            </Field>

            <Field id={`${formId}-description`} label="Description">
                <Textarea
                    id={`${formId}-description`}
                    placeholder="Optional"
                    value={values.description}
                    onChange={(e) => set('description', e.target.value)}
                />
            </Field>

            <ChecklistEditor idPrefix={formId} items={values.checklist} onChange={(items) => set('checklist', items)} />
        </form>
    );
};

export default TaskForm;
