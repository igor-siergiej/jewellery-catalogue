import { type Goal, type GoalSource, goalSourceEnum } from '@jewellery-catalogue/types';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GOAL_SOURCE_LABELS } from '@/lib/boardLabels';

import { BoardFormShell, DateField, Field, TitleField, useFormSet } from '../BoardForm';

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

export const goalToPayload = (values: GoalFormValues, target: number) => ({
    title: values.title.trim(),
    targetValue: target,
    unit: values.unit.trim() || undefined,
    source: values.source,
    targetDate: values.targetDate,
});

/** The goal fields shared by the Add goal and Edit goal dialogs. The dialog owns the values and the submit. */
const GoalForm: React.FC<{
    formId: string;
    mode: 'add' | 'edit';
    values: GoalFormValues;
    onChange: (values: GoalFormValues) => void;
    onSubmit: () => void;
}> = ({ formId, mode, values, onChange, onSubmit }) => {
    const set = useFormSet(values, onChange);

    return (
        <BoardFormShell formId={formId} onSubmit={onSubmit}>
            <TitleField
                formId={formId}
                placeholder="What you want to reach"
                value={values.title}
                onChange={(v) => set('title', v)}
            />

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

            <DateField
                id={`${formId}-date`}
                label="Target date"
                value={values.targetDate}
                onChange={(d) => set('targetDate', d)}
            />
        </BoardFormShell>
    );
};

export default GoalForm;
