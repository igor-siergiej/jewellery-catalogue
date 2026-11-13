import { describe, expect, it } from 'vite-plus/test';

import { describeAvailability, formatAmount } from './materialAvailability';

describe('describeAvailability', () => {
    it('is enough when stock covers the amount needed', () => {
        expect(describeAvailability({ required: 2, available: 10, unit: 'pcs', quantity: 3 })).toBe('Enough');
    });

    it('checks one design when no quantity is entered', () => {
        expect(describeAvailability({ required: 4, available: 3, unit: 'pcs', quantity: 0 })).toBe('Short by 1 pcs');
    });

    it('names the shortfall for the quantity entered', () => {
        expect(describeAvailability({ required: 10, available: 25, unit: 'pcs', quantity: 3 })).toBe('Short by 5 pcs');
    });

    it('trims float noise in metres', () => {
        expect(describeAvailability({ required: 0.3, available: 0.1, unit: 'm', quantity: 1 })).toBe('Short by 0.2 m');
    });
});

describe('formatAmount', () => {
    it('shows whole numbers without decimals and others to 2 places', () => {
        expect(formatAmount(70)).toBe('70');
        expect(formatAmount(0.125)).toBe('0.13');
        expect(formatAmount(1.5)).toBe('1.5');
    });
});
