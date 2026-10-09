import { describe, expect, it } from 'bun:test';
import { ETSY_TAG_MAX_LENGTH, normaliseEtsyTag } from '@jewellery-catalogue/types';

describe('normaliseEtsyTag', () => {
    it('lowercases, collapses whitespace and replaces disallowed characters with spaces', () => {
        expect(normaliseEtsyTag('  Boho/Hippie   Earrings! ')).toBe('boho hippie earrings');
    });

    it('keeps hyphens and apostrophes', () => {
        expect(normaliseEtsyTag("Mother's Rose-Gold")).toBe("mother's rose-gold");
    });

    it('accepts a tag of exactly the max length and rejects one character more', () => {
        expect(normaliseEtsyTag('a'.repeat(ETSY_TAG_MAX_LENGTH))).toBe('a'.repeat(ETSY_TAG_MAX_LENGTH));
        expect(normaliseEtsyTag('a'.repeat(ETSY_TAG_MAX_LENGTH + 1))).toBeNull();
    });

    it('rejects tags that are empty after cleaning', () => {
        expect(normaliseEtsyTag(' !!! ')).toBeNull();
    });
});
