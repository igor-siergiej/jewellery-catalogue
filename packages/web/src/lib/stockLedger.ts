import type { Design, ProducibleSummary } from '@jewellery-catalogue/types';

import { type EtsyStatus, getEtsyStatus } from '@/lib/etsyStatus';
import { isLowStockDesign, isLowStockVariant } from '@/utils/lowStock';

export type StockSeverity = 'out' | 'low' | 'ok';

export interface StockRow {
    design: Design;
    inStock: number;
    canMake: number | null;
    severity: StockSeverity;
    problemVariants: { name: string; inStock: number }[];
    etsy: EtsyStatus;
}

const SEVERITY_ORDER: Record<StockSeverity, number> = { out: 0, low: 1, ok: 2 };

function buildRow(design: Design, producible: Map<string, ProducibleSummary>): StockRow {
    const variants = design.variants ?? [];
    const inStock = variants.length ? variants.reduce((sum, v) => sum + v.totalQuantity, 0) : design.totalQuantity;
    const low = isLowStockDesign(design);
    const severity: StockSeverity = low && inStock === 0 ? 'out' : low ? 'low' : 'ok';

    return {
        design,
        inStock,
        canMake: producible.get(design.id)?.canMake ?? null,
        severity,
        problemVariants: variants
            .filter((v) => isLowStockVariant(design, v))
            .map((v) => ({ name: v.name, inStock: v.totalQuantity })),
        etsy: getEtsyStatus(design),
    };
}

export function buildStockRows(designs: Design[], producible: Map<string, ProducibleSummary>): StockRow[] {
    return designs
        .map((design) => buildRow(design, producible))
        .sort(
            (a, b) =>
                SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
                a.design.name.localeCompare(b.design.name, undefined, { sensitivity: 'base' })
        );
}
