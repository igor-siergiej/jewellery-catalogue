import { describe, expect, it } from 'bun:test';
import type { Design, Sale } from '@jewellery-catalogue/types';

import { calculateSalesReport, hoursFromTimeRequired } from './calculateSalesReport';

const makeDesign = (overrides: Partial<Design> = {}): Design => ({
    id: 'ring',
    userId: 'user-1',
    name: 'Silver Ring',
    description: '',
    timeRequired: '01:30',
    materials: [],
    imageIds: [],
    diagramImageIds: [],
    makingNotes: '',
    price: 30,
    totalMaterialCosts: 4,
    dateAdded: new Date(),
    totalQuantity: 0,
    ...overrides,
});

let nextTransactionId = 1;
const makeSale = (overrides: Partial<Sale> = {}): Sale => ({
    userId: 'user-1',
    designId: 'ring',
    variantId: null,
    listingId: 1,
    receiptId: 1,
    transactionId: nextTransactionId++,
    title: 'Silver Ring',
    quantity: 1,
    price: 30,
    soldAt: 0,
    status: 'applied',
    ...overrides,
});

describe('hoursFromTimeRequired', () => {
    it('parses HH:MM into hours', () => {
        expect(hoursFromTimeRequired('01:30')).toBe(1.5);
        expect(hoursFromTimeRequired('00:15')).toBe(0.25);
    });

    it('treats empty or malformed values as no time', () => {
        expect(hoursFromTimeRequired('')).toBe(0);
        expect(hoursFromTimeRequired('abc')).toBe(0);
        expect(hoursFromTimeRequired('2')).toBe(2);
    });
});

describe('calculateSalesReport', () => {
    it('returns zeroed totals and a null margin when there are no sales', () => {
        const report = calculateSalesReport({ sales: [], designs: [makeDesign()], hourlyRate: 10 });

        expect(report.totals).toEqual({
            unitsSold: 0,
            revenue: 0,
            materialCost: 0,
            labourCost: 0,
            profit: 0,
            marginPercent: null,
        });
        expect(report.designs).toEqual([]);
    });

    it('computes revenue, material cost, labour cost and profit per design', () => {
        const report = calculateSalesReport({
            sales: [makeSale({ quantity: 2 }), makeSale()],
            designs: [makeDesign()],
            hourlyRate: 10,
        });

        // 3 units at £30, materials £4 each, 1.5h × £10 labour each
        expect(report.designs).toEqual([
            {
                designId: 'ring',
                name: 'Silver Ring',
                unitsSold: 3,
                revenue: 90,
                materialCost: 12,
                labourCost: 45,
                profit: 33,
                marginPercent: 36.67,
            },
        ]);
        expect(report.totals).toMatchObject({ unitsSold: 3, revenue: 90, profit: 33, marginPercent: 36.67 });
    });

    it("uses the sold variant's material cost when the sale has one", () => {
        const design = makeDesign({
            timeRequired: '00:00',
            totalMaterialCosts: 0,
            variants: [{ id: 'gold', optionIds: [], name: 'Gold', totalQuantity: 0, totalMaterialCosts: 9, price: 40 }],
        });

        const report = calculateSalesReport({
            sales: [makeSale({ variantId: 'gold', price: 40 })],
            designs: [design],
            hourlyRate: 10,
        });

        expect(report.designs[0]).toMatchObject({ materialCost: 9, labourCost: 0, profit: 31 });
    });

    it('keeps sales without a known design out of totals and reports them separately', () => {
        const report = calculateSalesReport({
            sales: [makeSale(), makeSale({ designId: null, quantity: 2, price: 12.5 }), makeSale({ designId: 'gone' })],
            designs: [makeDesign()],
            hourlyRate: 0,
        });

        expect(report.unmatched).toEqual({ unitsSold: 3, revenue: 55 });
        expect(report.totals).toMatchObject({ unitsSold: 1, revenue: 30 });
    });

    it('sorts designs by revenue so best sellers come first, and can show a loss', () => {
        const report = calculateSalesReport({
            sales: [
                makeSale({ designId: 'cheap', price: 5 }),
                makeSale({ designId: 'ring', price: 30 }),
                makeSale({ designId: 'cheap', price: 5 }),
            ],
            designs: [makeDesign(), makeDesign({ id: 'cheap', name: 'Cheap Charm', totalMaterialCosts: 6 })],
            hourlyRate: 0,
        });

        expect(report.designs.map((d) => d.designId)).toEqual(['ring', 'cheap']);
        expect(report.designs[1]).toMatchObject({ revenue: 10, materialCost: 12, profit: -2, marginPercent: -20 });
    });
});
