import { DesignType } from '@jewellery-catalogue/types';
import { useId } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { DESIGN_TYPE_LABELS } from '../../../lib/materialLabels';
import DurationInput from '../../DurationInput';
import { FormSection } from '../../FormSection';
import { OptionPicker } from '../../OptionPicker';
import type { AddDesignFormData } from '../types';

const TYPE_OPTIONS = (Object.keys(DesignType) as DesignType[]).map((type) => ({
    value: type,
    label: DESIGN_TYPE_LABELS[type],
}));

interface BasicsSectionProps {
    form: UseFormReturn<AddDesignFormData>;
    mode: 'create' | 'edit';
}

export function BasicsSection({ form, mode }: BasicsSectionProps) {
    const typeLabelId = useId();

    return (
        <FormSection title="Basics">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter design name" className="max-w-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="designType"
                render={({ field }) => (
                    <FormItem>
                        <span id={typeLabelId} className="text-sm font-medium leading-none">
                            Type
                        </span>
                        <FormControl>
                            <OptionPicker
                                options={TYPE_OPTIONS}
                                value={field.value}
                                onChange={field.onChange}
                                aria-labelledby={typeLabelId}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <DurationInput form={form} name="timeRequired" />

            {mode === 'edit' && (
                <FormField
                    control={form.control}
                    name="catalogueOnly"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-3 space-y-0">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1.5">
                                <FormLabel>Catalogue only</FormLabel>
                                <FormDescription>
                                    Keep this design in the catalogue only. It can't be sent to Etsy.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />
            )}
        </FormSection>
    );
}
