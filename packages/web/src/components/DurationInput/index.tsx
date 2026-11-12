import { useId } from 'react';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { formatDuration, parseDuration } from '../../lib/duration';

export interface DurationInputProps<T extends FieldValues> {
    form: UseFormReturn<T>;
    name: FieldPath<T>;
    label?: string;
}

function DurationInput<T extends FieldValues>({ form, name, label = 'Time to make' }: DurationInputProps<T>) {
    const id = useId();
    const groupId = `${id}-group`;

    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => {
                const stored = parseDuration(field.value);
                const raw: string = field.value ?? '';
                const blank = raw === '';
                // Keep an empty box empty while the other box holds a value
                const hoursValue = blank ? '' : String(stored.hours);
                const minutesValue = blank ? '' : String(stored.minutes);

                const update = (hours: string, minutes: string) => {
                    if (hours === '' && minutes === '') {
                        field.onChange('');

                        return;
                    }

                    field.onChange(formatDuration(Number.parseInt(hours, 10) || 0, Number.parseInt(minutes, 10) || 0));
                };

                return (
                    <FormItem>
                        <span id={groupId} className="text-sm font-medium leading-none">
                            {label}
                        </span>
                        <div role="group" aria-labelledby={groupId} className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <Input
                                    id={`${id}-hours`}
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    step={1}
                                    className="w-20 bg-background"
                                    value={hoursValue}
                                    onChange={(e) => update(e.target.value, minutesValue)}
                                    onBlur={field.onBlur}
                                />
                                <Label htmlFor={`${id}-hours`} className="text-muted-foreground font-normal">
                                    Hours
                                </Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Input
                                    id={`${id}-minutes`}
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    step={1}
                                    className="w-20 bg-background"
                                    value={minutesValue}
                                    onChange={(e) => update(hoursValue, e.target.value)}
                                    onBlur={field.onBlur}
                                />
                                <Label htmlFor={`${id}-minutes`} className="text-muted-foreground font-normal">
                                    Minutes
                                </Label>
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
}

export default DurationInput;
