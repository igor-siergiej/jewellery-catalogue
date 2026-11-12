import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

import MultiImageUpload from '../../MultiImageUpload';
import type { AddDesignFormData } from '../types';
import { FormSection } from './FormSection';

export function PhotosSection({ form }: { form: UseFormReturn<AddDesignFormData> }) {
    return (
        <FormSection title="Photos">
            <FormField
                control={form.control}
                name="images"
                render={({ field, fieldState }) => (
                    <FormItem>
                        <FormControl>
                            <MultiImageUpload
                                value={field.value ?? []}
                                onChange={field.onChange}
                                hasError={!!fieldState.error}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </FormSection>
    );
}
