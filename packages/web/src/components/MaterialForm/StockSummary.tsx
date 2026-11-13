import type { Material } from '@jewellery-catalogue/types';
import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

type MaterialValues = Partial<
    Record<'totalLength' | 'lengthPerPack' | 'totalQuantity' | 'quantityPerPack' | 'addPacks', number>
>;

/** Stock and pack size as the form currently holds them, falling back to the saved material. */
export function useStockSummary(form: UseFormReturn<any>, material: Material) {
    const addPacks = form.watch('addPacks');
    const lengthPerPack = form.watch('lengthPerPack');
    const quantityPerPack = form.watch('quantityPerPack');
    const totalLength = form.watch('totalLength');
    const totalQuantity = form.watch('totalQuantity');
    const saved = material as Material & MaterialValues;

    const currentStock = useMemo(() => {
        switch (material.type) {
            case 'WIRE':
            case 'CHAIN': {
                const current = totalLength ?? saved.totalLength;

                return `${Number(current).toFixed(2)}m`;
            }

            case 'BEAD':
            case 'EAR_HOOK': {
                const current = totalQuantity ?? saved.totalQuantity;

                return `${Math.round(current as number)} pieces`;
            }

            default:
                return 'N/A';
        }
    }, [material, saved, totalLength, totalQuantity]);

    const packSize = useMemo(() => {
        switch (material.type) {
            case 'WIRE':
            case 'CHAIN': {
                const perPack = lengthPerPack ?? saved.lengthPerPack;

                return `${Number(perPack).toFixed(2)}m per pack`;
            }

            case 'BEAD':
            case 'EAR_HOOK': {
                const perPack = quantityPerPack ?? saved.quantityPerPack;

                return `${Math.round(perPack as number)} per pack`;
            }

            default:
                return 'N/A';
        }
    }, [material, saved, lengthPerPack, quantityPerPack]);

    const estimatedNewStock = useMemo(() => {
        if (!addPacks || addPacks <= 0) return null;

        switch (material.type) {
            case 'WIRE':
            case 'CHAIN': {
                const current = totalLength ?? saved.totalLength;
                const perPack = lengthPerPack ?? saved.lengthPerPack;

                return `${Number(current + addPacks * perPack).toFixed(2)}m`;
            }

            case 'BEAD':
            case 'EAR_HOOK': {
                const current = totalQuantity ?? saved.totalQuantity;
                const perPack = quantityPerPack ?? saved.quantityPerPack;

                return `${Math.round((current as number) + addPacks * (perPack as number))} pieces`;
            }

            default:
                return null;
        }
    }, [addPacks, material, saved, lengthPerPack, quantityPerPack, totalLength, totalQuantity]);

    return { currentStock, packSize, estimatedNewStock };
}
