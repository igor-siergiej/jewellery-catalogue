import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

import { useUserSettings } from '../../../hooks/useUserSettings';
import { FormSection } from '../../FormSection';
import PriceBreakdown from '../../PriceBreakdown';
import SuggestedPrice from '../../SuggestedPrice';
import { computeVariants } from '../../VariationGroupBuilder';
import type { AddDesignFormData } from '../types';

export function PriceSection({ form }: { form: UseFormReturn<AddDesignFormData> }) {
    const { hourlyWage, profitMargin, markupMultiplier, hourlyRate } = useUserSettings();
    const selectedMaterials = form.watch('materials');
    const currentTimeRequired = form.watch('timeRequired');
    const variationGroups = form.watch('variationGroups') ?? [];
    const totalMaterialCosts = form.watch('totalMaterialCosts') ?? 0;
    const hasVariationGroups = variationGroups.length > 0;

    const materialsCost = (() => {
        if (hasVariationGroups) {
            const variants = computeVariants(
                variationGroups,
                selectedMaterials,
                hourlyWage,
                profitMargin,
                currentTimeRequired
            );

            return variants.length > 0 ? Math.min(...variants.map((v) => v.totalMaterialCosts)) : 0;
        }

        return totalMaterialCosts;
    })();

    return (
        <FormSection title="Price">
            <PriceBreakdown
                materialsCost={materialsCost}
                timeRequired={currentTimeRequired}
                hourlyWage={hourlyWage}
                profitMargin={profitMargin}
                priceField={
                    hasVariationGroups ? (
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Final price</p>
                            <p className="text-sm text-muted-foreground">
                                Varies per variant. Each variant's price is shown under Variations.
                            </p>
                        </div>
                    ) : (
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Final price</FormLabel>
                                    <InputGroup className="max-w-[180px]">
                                        <InputGroupAddon align="inline-start">
                                            <InputGroupText>£</InputGroupText>
                                        </InputGroupAddon>
                                        <FormControl>
                                            <InputGroupInput
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === '' ? undefined : Number(value));
                                                }}
                                            />
                                        </FormControl>
                                    </InputGroup>
                                    <SuggestedPrice
                                        materialsCost={totalMaterialCosts}
                                        timeRequired={currentTimeRequired}
                                        markupMultiplier={markupMultiplier}
                                        hourlyRate={hourlyRate}
                                        onUse={(price) => field.onChange(price)}
                                    />
                                    <FormDescription>Calculated above. Edit to override.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )
                }
            />
        </FormSection>
    );
}
