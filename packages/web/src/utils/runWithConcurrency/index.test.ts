import { describe, expect, it } from 'vitest';

import { runWithConcurrency } from '.';

describe('runWithConcurrency', () => {
    it('runs every item but never more than the limit at once', async () => {
        let running = 0;
        let peak = 0;
        const done: number[] = [];

        await runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
            running++;
            peak = Math.max(peak, running);
            await new Promise((resolve) => setTimeout(resolve, 5));
            done.push(n);
            running--;
        });

        expect(done.sort()).toEqual([1, 2, 3, 4, 5]);
        expect(peak).toBe(2);
    });

    it('handles an empty list', async () => {
        await expect(runWithConcurrency([], 3, async () => {})).resolves.toBeUndefined();
    });
});
