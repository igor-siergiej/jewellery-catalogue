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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TASK_IMPORTANCE_LABELS, TASK_RECURRENCE_LABELS, TASK_SUBJECT_LABELS } from '@/lib/boardLabels';

import { BoardFormShell, DateField, Field, TitleField, useFormSet } from '../BoardForm';
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

export const taskToPayload = (values: TaskFormValues) => ({
    title: values.title.trim(),
    subject: values.subject,
    importance: values.importance,
    recurrence: values.recurrence,
    dueDate: values.dueDate,
    description: values.description.trim() || undefined,
    checklist: values.checklist,
});

/** The task fields shared by the Add task and Edit task dialogs. The dialog owns the values and the submit. */
const TaskForm: React.FC<{
    formId: string;
    values: TaskFormValues;
    onChange: (values: TaskFormValues) => void;
    onSubmit: () => void;
}> = ({ formId, values, onChange, onSubmit }) => {
    const set = useFormSet(values, onChange);

    return (
        <BoardFormShell formId={formId} onSubmit={onSubmit}>
            <TitleField
                formId={formId}
                placeholder="What needs doing"
                value={values.title}
                onChange={(v) => set('title', v)}
            />

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

            <DateField
                id={`${formId}-due`}
                label="Due date"
                value={values.dueDate}
                onChange={(d) => set('dueDate', d)}
            />

            <Field id={`${formId}-description`} label="Description">
                <Textarea
                    id={`${formId}-description`}
                    placeholder="Optional"
                    value={values.description}
                    onChange={(e) => set('description', e.target.value)}
                />
            </Field>

            <ChecklistEditor idPrefix={formId} items={values.checklist} onChange={(items) => set('checklist', items)} />
        </BoardFormShell>
    );
};

export default TaskForm;
