import type { Material } from '@jewellery-catalogue/types';
import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { useUserSettings } from '../../hooks/useUserSettings';
import { getTotalMaterialCosts } from '../../utils/getPriceOfMaterials';
import { getWageCosts } from '../../utils/getWageCost';
import { computeVariants } from '../VariationGroupBuilder';
import type { AddDesignFormData } from './types';

/** Keeps totalMaterialCosts and price in step with materials, time, variations and the user's rates. */
export function useDesignPricing(form: UseFormReturn<AddDesignFormData>, materials: Material[] | undefined) {
    const { hourlyWage, profitMargin } = useUserSettings();
    const selectedMaterials = form.watch('materials');
    const currentTimeRequired = form.watch('timeRequired');
    const variationGroups = form.watch('variationGroups') ?? [];

    useEffect(() => {
        if (!materials) return;

        const materialsCost = selectedMaterials.length > 0 ? getTotalMaterialCosts(selectedMaterials, []) : 0;
        const rawWage = getWageCosts(currentTimeRequired) * hourlyWage;
        const timeSpentCost = Number.isFinite(rawWage) ? parseFloat(rawWage.toFixed(2)) : 0;
        const subtotal = materialsCost + timeSpentCost;
        const finalPrice = parseFloat((subtotal * (1 + profitMargin / 100)).toFixed(2));

        form.setValue('totalMaterialCosts', materialsCost);

        if (variationGroups.length > 0) {
            const variants = computeVariants(
                variationGroups,
                selectedMaterials,
                hourlyWage,
                profitMargin,
                currentTimeRequired
            );

            const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0;
            form.setValue('price', minPrice >= 0 ? minPrice : 0);
        } else {
            form.setValue('price', finalPrice >= 0 ? finalPrice : 0);
        }
    }, [selectedMaterials, currentTimeRequired, hourlyWage, profitMargin, materials, variationGroups, form.setValue]);
}
