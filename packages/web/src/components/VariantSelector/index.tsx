import type { Design, Material } from '@jewellery-catalogue/types';
import { Check } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMaterialAvailability } from '@/lib/materialAvailability';
import { cn } from '@/lib/utils';

export interface VariantSelectorProps {
    design: Design;
    allMaterials: Material[];
    selectedVariantId: string | undefined;
    onSelect: (variantId: string) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
    design,
    allMaterials,
    selectedVariantId,
    onSelect,
}) => {
    const variants = design.variants ?? [];
    const groups = design.variationGroups ?? [];

    const rows = variants.map((variant) => {
        const optionMaterials = variant.optionIds.flatMap((optionId) => {
            const option = groups.flatMap((group) => group.options).find((o) => o.id === optionId);

            return option ? [option.material] : [];
        });

        let canMake = Number.POSITIVE_INFINITY;

        for (const required of [...design.materials, ...optionMaterials]) {
            canMake = Math.min(canMake, getMaterialAvailability(required, allMaterials).canMake);
        }

        return { variant, canMake: Number.isFinite(canMake) ? canMake : 0 };
    });

    return (
        <div className="rounded-lg border bg-card">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Variant</TableHead>
                        <TableHead data-numeric>In stock</TableHead>
                        <TableHead data-numeric>Can make</TableHead>
                        <TableHead data-numeric>Price</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(({ variant, canMake }) => {
                        const isSelected = selectedVariantId === variant.id;

                        return (
                            <TableRow
                                key={variant.id}
                                className={cn('cursor-pointer', isSelected && 'bg-accent hover:bg-accent')}
                                onClick={() => onSelect(variant.id)}
                            >
                                <TableCell data-name title={variant.name} className="w-full font-medium">
                                    <button
                                        type="button"
                                        aria-pressed={isSelected}
                                        className="inline-flex max-w-full items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <span className="truncate">{variant.name}</span>
                                        {isSelected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                                    </button>
                                </TableCell>
                                <TableCell data-numeric>{variant.totalQuantity}</TableCell>
                                <TableCell data-numeric className={cn(canMake === 0 && 'text-destructive')}>
                                    {canMake}
                                </TableCell>
                                <TableCell data-numeric>£{variant.price.toFixed(2)}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};
