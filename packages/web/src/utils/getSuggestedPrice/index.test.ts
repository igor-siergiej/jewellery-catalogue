import { describe, expect, it } from 'bun:test';

import { getSuggestedPrice } from './index';

describe('getSuggestedPrice', () => {
    it('applies materialsCost × markupMultiplier + hours × hourlyRate', () => {
        const result = getSuggestedPrice({
            materialsCost: 10,
            timeRequired: '02:00',
            markupMultiplier: 2.5,
            hourlyRate: 5,
        });

        // 10 * 2.5 = 25, + 2 hours * 5 = 10 -> 35
        expect(result).toBe(35);
    });

    it('handles minutes correctly (partial hours)', () => {
        const result = getSuggestedPrice({
            materialsCost: 0,
            timeRequired: '00:30',
            markupMultiplier: 1,
            hourlyRate: 10,
        });

        // 0.5 hours * 10 = 5
        expect(result).toBe(5);
    });

    it('rounds to 2 decimal places', () => {
        const result = getSuggestedPrice({
            materialsCost: 10,
            timeRequired: '00:10',
            markupMultiplier: 1.111,
            hourlyRate: 3,
        });

        // 10 * 1.111 = 11.11, + (10/60)*3 = 0.5 -> 11.61
        expect(result).toBeCloseTo(11.61, 2);
    });

    it('returns 0 for an unparseable timeRequired without throwing', () => {
        const result = getSuggestedPrice({
            materialsCost: 5,
            timeRequired: '',
            markupMultiplier: 2,
            hourlyRate: 10,
        });

        // materialsCost * markupMultiplier = 10, + 0 hours (unparseable -> NaN -> treated as 0)
        expect(result).toBe(10);
    });
});
