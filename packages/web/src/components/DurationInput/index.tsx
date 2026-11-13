import { useId, useRef, useState } from 'react';
import type { ControllerRenderProps, FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

import { FormField, FormItem, FormMessage, useFormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { formatDuration, parseDuration } from '../../lib/duration';

interface DurationInputProps<T extends FieldValues> {
    form: UseFormReturn<T>;
    name: FieldPath<T>;
    label?: string;
}

interface Boxes {
    hours: string;
    minutes: string;
}

const isInteger = (value: string) => /^\d+$/.test(value);

const toBoxes = (stored: string | undefined): Boxes => {
    if (!stored) return { hours: '', minutes: '' };

    const { hours, minutes } = parseDuration(stored);

    return { hours: String(hours), minutes: String(minutes) };
};

const toStored = ({ hours, minutes }: Boxes): string => {
    if (hours === '' && minutes === '') return '';

    return formatDuration(Number.parseInt(hours, 10) || 0, Number.parseInt(minutes, 10) || 0);
};

function DurationFields({ field, label }: { field: ControllerRenderProps<FieldValues, string>; label: string }) {
    const id = useId();
    const groupId = `${id}-group`;
    const { error, formMessageId } = useFormField();
    const stored: string = field.value ?? '';
    const [boxes, setBoxes] = useState<Boxes>(() => toBoxes(stored));
    const committed = useRef(stored);

    // A value set from outside (form reset, restored draft) replaces what the boxes show
    if (stored !== committed.current) {
        committed.current = stored;
        setBoxes(toBoxes(stored));
    }

    const change = (next: Boxes) => {
        setBoxes(next);

        if ((next.hours === '' || isInteger(next.hours)) && (next.minutes === '' || isInteger(next.minutes))) {
            const value = toStored(next);
            committed.current = value;
            field.onChange(value);
        }
    };

    const blur = () => {
        const normalised = toBoxes(committed.current);
        setBoxes({
            hours: boxes.hours === '' && normalised.hours === '0' ? '' : normalised.hours,
            minutes: boxes.minutes === '' && normalised.minutes === '0' ? '' : normalised.minutes,
        });
        field.onBlur();
    };

    const describedBy = error ? formMessageId : undefined;

    const box = (part: keyof Boxes, text: string) => (
        <div className="flex items-center gap-1.5">
            <Input
                id={`${id}-${part}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="w-20 bg-background"
                value={boxes[part]}
                aria-invalid={!!error}
                aria-describedby={describedBy}
                onChange={(e) => change({ ...boxes, [part]: e.target.value })}
                onBlur={blur}
            />
            <Label htmlFor={`${id}-${part}`} className="font-normal text-muted-foreground">
                {text}
            </Label>
        </div>
    );

    return (
        <>
            <span id={groupId} className="text-sm font-medium leading-none">
                {label}
            </span>
            <div role="group" aria-labelledby={groupId} className="flex items-center gap-2">
                {box('hours', 'Hours')}
                {box('minutes', 'Minutes')}
            </div>
        </>
    );
}

function DurationInput<T extends FieldValues>({ form, name, label = 'Time to make' }: DurationInputProps<T>) {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <DurationFields
                        field={field as unknown as ControllerRenderProps<FieldValues, string>}
                        label={label}
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export default DurationInput;
