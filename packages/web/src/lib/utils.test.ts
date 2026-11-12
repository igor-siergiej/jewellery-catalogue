import { describe, expect, it } from 'vite-plus/test';

import { pluralise } from './utils';

describe('pluralise', () => {
    it('uses the singular for exactly one', () => {
        expect(pluralise(1, 'design')).toBe('1 design');
    });

    it('adds an s for zero and many', () => {
        expect(pluralise(0, 'design')).toBe('0 designs');
        expect(pluralise(3, 'design')).toBe('3 designs');
    });

    it('accepts an irregular plural', () => {
        expect(pluralise(2, 'box', 'boxes')).toBe('2 boxes');
    });
});
