import type { Material } from '@jewellery-catalogue/types';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

import { AddMaterialsTable } from '../../AddMaterialsTable';
import type { AddDesignFormData } from '../types';
import { FormSection } from './FormSection';

interface MaterialsSectionProps {
    form: UseFormReturn<AddDesignFormData>;
    materials: Material[];
    hasVariationGroups: boolean;
}

export function MaterialsSection({ form, materials, hasVariationGroups }: MaterialsSectionProps) {
    return (
        <FormSection
            title={hasVariationGroups ? 'Shared materials' : 'Materials'}
            description={hasVariationGroups ? 'Used in every variant' : undefined}
        >
            <FormField
                control={form.control}
                name="materials"
                render={({ field, fieldState }) => (
                    <FormItem>
                        <FormControl>
                            <AddMaterialsTable
                                availableMaterials={materials}
                                setValue={form.setValue}
                                hasError={!!fieldState.error}
                                value={field.value}
                            />
                        </FormControl>
                        {fieldState.error && !fieldState.error.message && (
                            <p className="text-[0.8rem] font-medium text-destructive">
                                Check the amount for each material
                            </p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />
        </FormSection>
    );
}
