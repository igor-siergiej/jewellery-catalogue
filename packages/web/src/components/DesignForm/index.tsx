import type { Material } from '@jewellery-catalogue/types';
import type { UseFormReturn } from 'react-hook-form';

import { Form } from '@/components/ui/form';

import { BasicsSection } from './sections/BasicsSection';
import { MaterialsSection } from './sections/MaterialsSection';
import { MoreOptions } from './sections/MoreOptions';
import { PhotosSection } from './sections/PhotosSection';
import { PriceSection } from './sections/PriceSection';
import type { AddDesignFormData } from './types';
import { useDesignPricing } from './useDesignPricing';

export type { AddDesignFormData } from './types';

export interface DesignFormProps {
    form: UseFormReturn<AddDesignFormData>;
    mode: 'create' | 'edit';
    materials: Material[];
    disabled?: boolean;
}

/** The design fields shared by Add Design and the Edit design dialog. The caller owns the <form>, submit and drafts. */
export function DesignForm({ form, mode, materials, disabled }: DesignFormProps) {
    useDesignPricing(form, materials);
    const hasVariationGroups = (form.watch('variationGroups') ?? []).length > 0;

    return (
        <Form {...form}>
            <fieldset disabled={disabled} className="min-w-0">
                <BasicsSection form={form} mode={mode} />
                <MaterialsSection form={form} materials={materials} hasVariationGroups={hasVariationGroups} />
                <PriceSection form={form} />
                <PhotosSection form={form} />
                <MoreOptions form={form} materials={materials} />
            </fieldset>
        </Form>
    );
}
