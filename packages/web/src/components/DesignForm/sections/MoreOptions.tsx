import type { Material } from '@jewellery-catalogue/types';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useUserSettings } from '../../../hooks/useUserSettings';
import { cn } from '../../../lib/utils';
import { FormSection } from '../../FormSection';
import MakerDocsSection from '../../MakerDocsSection';
import { OptionalNumberInput } from '../../OptionalNumberInput';
import RichTextEditor from '../../RichTextEditor';
import { VariationGroupBuilder } from '../../VariationGroupBuilder';
import { hasMoreOptionsData } from '../moreOptions';
import type { AddDesignFormData } from '../types';

const MORE_FIELDS = ['variationGroups', 'description', 'diagramImages', 'makingNotes', 'lowStockThreshold'] as const;

interface MoreOptionsProps {
    form: UseFormReturn<AddDesignFormData>;
    materials: Material[];
}

export function MoreOptions({ form, materials }: MoreOptionsProps) {
    const { hourlyWage, profitMargin, markupMultiplier, hourlyRate } = useUserSettings();
    const selectedMaterials = form.watch('materials');
    const currentTimeRequired = form.watch('timeRequired');

    const hasData = hasMoreOptionsData({
        variationGroups: form.watch('variationGroups'),
        description: form.watch('description'),
        diagramImages: form.watch('diagramImages'),
        makingNotes: form.watch('makingNotes'),
        lowStockThreshold: form.watch('lowStockThreshold'),
    });

    const { errors } = form.formState;
    const hasError = MORE_FIELDS.some((name) => !!errors[name]);
    const [open, setOpen] = useState(hasData);

    // Values can arrive after mount (a restored draft), and a failed submit must show its message
    useEffect(() => {
        if (hasData || hasError) setOpen(true);
    }, [hasData, hasError]);

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="pt-6">
            <CollapsibleTrigger asChild>
                <Button type="button" variant="outline">
                    More options
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
                </Button>
            </CollapsibleTrigger>
            <p className="mt-2 text-sm text-muted-foreground">Variations, description, maker docs and stock alert</p>

            {/* Kept mounted so RHF can focus a field with an error and editors keep their state */}
            <CollapsibleContent forceMount className="mt-6 data-[state=closed]:hidden">
                <FormSection title="Variations" description="Options a buyer picks, like gemstone or wire type">
                    <FormField
                        control={form.control}
                        name="variationGroups"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <VariationGroupBuilder
                                        availableMaterials={materials}
                                        value={field.value ?? []}
                                        onChange={field.onChange}
                                        sharedMaterials={selectedMaterials}
                                        hourlyWage={hourlyWage}
                                        profitMargin={profitMargin}
                                        timeRequired={currentTimeRequired}
                                        markupMultiplier={markupMultiplier}
                                        hourlyRate={hourlyRate}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormSection>

                <FormSection title="Description">
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Description</FormLabel>
                                <FormControl>
                                    <RichTextEditor
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        placeholder="Add notes about how to create this design..."
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormSection>

                <FormSection title="Maker docs" description="Private, never shown on Etsy">
                    <MakerDocsSection control={form.control} />
                </FormSection>

                <FormSection title="Stock alert">
                    <FormField
                        control={form.control}
                        name="lowStockThreshold"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Low stock threshold</FormLabel>
                                <FormControl>
                                    <OptionalNumberInput
                                        placeholder="e.g., 5"
                                        className="max-w-[160px]"
                                        field={field}
                                    />
                                </FormControl>
                                <FormDescription>Alert when finished items drop below this quantity</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormSection>
            </CollapsibleContent>
        </Collapsible>
    );
}
