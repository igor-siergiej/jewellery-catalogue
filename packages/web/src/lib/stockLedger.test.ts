import type { Design, ProducibleSummary } from '@jewellery-catalogue/types';
import { describe, expect, it } from 'vite-plus/test';

import { buildStockRows } from './stockLedger';

const design = (over: Record<string, unknown>) =>
    ({ id: over.name, name: 'D', totalQuantity: 0, variants: [], ...over }) as unknown as Design;

const variant = (name: string, totalQuantity: number, lowStockThreshold?: number) => ({
    id: name,
    name,
    totalQuantity,
    lowStockThreshold,
});

const none = new Map<string, ProducibleSummary>();

describe('buildStockRows', () => {
    it('marks a simple design with zero stock and a threshold as out', () => {
        const [row] = buildStockRows([design({ name: 'a', totalQuantity: 0, lowStockThreshold: 2 })], none);
        expect(row.severity).toBe('out');
    });

    it('marks quantity below threshold as low and at or above as ok', () => {
        const rows = buildStockRows(
            [
                design({ name: 'a', totalQuantity: 1, lowStockThreshold: 2 }),
                design({ name: 'b', totalQuantity: 5, lowStockThreshold: 2 }),
                design({ name: 'c', totalQuantity: 2, lowStockThreshold: 2 }),
            ],
            none
        );

        expect(rows.map((r) => [r.design.name, r.severity])).toEqual([
            ['a', 'low'],
            ['b', 'ok'],
            ['c', 'ok'],
        ]);
    });

    it('does not mark zero stock without any threshold as out', () => {
        const [row] = buildStockRows([design({ name: 'a', totalQuantity: 0 })], none);
        expect(row.severity).toBe('ok');
    });

    it('sums variants and lists only problem variants', () => {
        const [row] = buildStockRows(
            [design({ name: 'a', variants: [variant('Gold', 0, 1), variant('Silver', 4, 1)] })],
            none
        );

        expect(row.inStock).toBe(4);
        expect(row.severity).toBe('low');
        expect(row.problemVariants).toEqual([{ name: 'Gold', inStock: 0 }]);
    });

    it('is out when all variants are empty and one is below threshold', () => {
        const [row] = buildStockRows(
            [design({ name: 'a', variants: [variant('Gold', 0, 1), variant('Silver', 0, 1)] })],
            none
        );

        expect(row.severity).toBe('out');
    });

    it('falls back to the design threshold for variants, and ignores variants with neither', () => {
        const [withFallback] = buildStockRows(
            [design({ name: 'a', lowStockThreshold: 3, variants: [variant('Gold', 2), variant('Silver', 9)] })],
            none
        );

        expect(withFallback.problemVariants).toEqual([{ name: 'Gold', inStock: 2 }]);

        const [noThreshold] = buildStockRows([design({ name: 'b', variants: [variant('Gold', 0)] })], none);
        expect(noThreshold.problemVariants).toEqual([]);
        expect(noThreshold.severity).toBe('ok');
    });

    it('canMake is null without a summary or with a null summary, and never a problem on its own', () => {
        const withNull = new Map([['a', { designId: 'a', canMake: null, variants: [] } as ProducibleSummary]]);
        const [row] = buildStockRows([design({ name: 'a', totalQuantity: 5, lowStockThreshold: 2 })], withNull);
        expect(row.canMake).toBeNull();
        expect(row.severity).toBe('ok');
        expect(buildStockRows([design({ name: 'b' })], none)[0].canMake).toBeNull();
    });

    it('passes canMake through, including zero', () => {
        const map = new Map([['a', { designId: 'a', canMake: 0, variants: [] } as ProducibleSummary]]);
        expect(buildStockRows([design({ name: 'a' })], map)[0].canMake).toBe(0);
    });

    it('sorts out, then low, then ok, then name case-insensitively', () => {
        const rows = buildStockRows(
            [
                design({ name: 'a', totalQuantity: 9, lowStockThreshold: 2 }),
                design({ name: 'b', totalQuantity: 0, lowStockThreshold: 2 }),
                design({ name: 'c', totalQuantity: 1, lowStockThreshold: 2 }),
                design({ name: 'B2', totalQuantity: 9 }),
            ],
            none
        );

        expect(rows.map((r) => r.design.name)).toEqual(['b', 'c', 'a', 'B2']);
    });
});
