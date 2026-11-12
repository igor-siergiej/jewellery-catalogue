import { type Goal, type GoalSource, goalSourceEnum } from '@jewellery-catalogue/types';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GOAL_SOURCE_LABELS } from '@/lib/boardLabels';

export interface GoalFormValues {
    title: string;
    targetValue: string;
    currentValue: string;
    unit: string;
    source: GoalSource;
    targetDate: Date | undefined;
}

export const EMPTY_GOAL_VALUES: GoalFormValues = {
    title: '',
    targetValue: '',
    currentValue: '',
    unit: '',
    source: 'manual',
    targetDate: undefined,
};

export const goalToFormValues = (goal: Goal): GoalFormValues => ({
    title: goal.title,
    targetValue: String(goal.targetValue),
    currentValue: String(goal.currentValue),
    unit: goal.unit ?? '',
    source: goal.source,
    targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
});

export const canSubmitGoal = (values: GoalFormValues) =>
    !!values.title.trim() && !!values.targetValue && Number(values.targetValue) > 0;

const Field = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        {children}
    </div>
);

/** The goal fields shared by the Add goal and Edit goal dialogs. The dialog owns the values and the submit. */
const GoalForm: React.FC<{
    formId: string;
    mode: 'add' | 'edit';
    values: GoalFormValues;
    onChange: (values: GoalFormValues) => void;
    onSubmit: () => void;
}> = ({ formId, mode, values, onChange, onSubmit }) => {
    const set = <K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) =>
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
                    placeholder="What you want to reach"
                    value={values.title}
                    onChange={(e) => set('title', e.target.value)}
                />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id={`${formId}-target`} label="Target">
                    <Input
                        id={`${formId}-target`}
                        type="number"
                        required
                        placeholder="e.g. 50"
                        value={values.targetValue}
                        onChange={(e) => set('targetValue', e.target.value)}
                    />
                </Field>

                {mode === 'edit' && (
                    <Field id={`${formId}-current`} label="Current progress">
                        <Input
                            id={`${formId}-current`}
                            type="number"
                            value={values.currentValue}
                            onChange={(e) => set('currentValue', e.target.value)}
                        />
                    </Field>
                )}

                <Field id={`${formId}-unit`} label="Unit">
                    <Input
                        id={`${formId}-unit`}
                        placeholder="Optional, e.g. listings"
                        value={values.unit}
                        onChange={(e) => set('unit', e.target.value)}
                    />
                </Field>
            </div>

            <Field id={`${formId}-source`} label="Track from">
                <Select value={values.source} onValueChange={(v) => set('source', v as GoalSource)}>
                    <SelectTrigger id={`${formId}-source`} className="min-h-11 md:min-h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {goalSourceEnum.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                                {GOAL_SOURCE_LABELS[opt]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>

            <Field id={`${formId}-date`} label="Target date">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id={`${formId}-date`}
                            type="button"
                            variant="outline"
                            className="min-h-11 w-full justify-start font-normal md:min-h-9"
                        >
                            {values.targetDate ? values.targetDate.toLocaleDateString() : 'Optional'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={values.targetDate} onSelect={(d) => set('targetDate', d)} />
                    </PopoverContent>
                </Popover>
            </Field>
        </form>
    );
};

export default GoalForm;
