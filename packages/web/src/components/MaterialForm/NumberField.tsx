import type { Control } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

interface NumberFieldProps {
    control: Control<any>;
    name: string;
    label: string;
    step?: string;
    prefix?: string;
    suffix?: string;
    description?: string;
    placeholder?: string;
    min?: string;
    /** Shown when the form holds no value yet, so edit forms display the saved material. */
    fallback?: number | null;
    className?: string;
}

export function NumberField({
    control,
    name,
    label,
    step,
    prefix,
    suffix,
    description,
    placeholder,
    min,
    fallback,
    className,
}: NumberFieldProps) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <InputGroup className={cn('h-11 max-w-[10rem] md:h-9', className)}>
                        {prefix && (
                            <InputGroupAddon align="inline-start">
                                <InputGroupText>{prefix}</InputGroupText>
                            </InputGroupAddon>
                        )}
                        <FormControl>
                            <InputGroupInput
                                type="number"
                                step={step}
                                min={min}
                                placeholder={placeholder}
                                {...field}
                                value={field.value ?? fallback ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    field.onChange(value === '' ? undefined : Number(value));
                                }}
                            />
                        </FormControl>
                        {suffix && (
                            <InputGroupAddon align="inline-end">
                                <InputGroupText>{suffix}</InputGroupText>
                            </InputGroupAddon>
                        )}
                    </InputGroup>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
