import { describe, expect, it } from 'bun:test';
import { ETSY_TAG_MAX_LENGTH, etsyListingSchema, etsyTagSchema, normaliseEtsyTag } from '@jewellery-catalogue/types';

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

describe('Etsy tag digits', () => {
    it('only allows decimal digits in tags', () => {
        expect(normaliseEtsyTag('size ½ ring')).toBe('size ring');
        expect(etsyTagSchema.safeParse('ring ½').success).toBe(false);
        expect(etsyTagSchema.safeParse('ring 925').success).toBe(true);
    });
});

describe('etsyListingSchema title', () => {
    const title = (t: string) => etsyListingSchema.shape.title.safeParse(t).success;

    it('accepts allowed characters and one each of % : & +', () => {
        expect(title('Silver Ring: 50% Off & Gift + Box ™')).toBe(true);
    });

    it('rejects emoji, currency symbols, ^ and ½', () => {
        for (const bad of ['Ring 💍', 'Ring £20', 'Ring $5', 'Ring ^', 'Ring ½']) expect(title(bad)).toBe(false);
    });

    it('rejects % : & or + used more than once', () => {
        for (const bad of ['5% 10%', 'a: b: c', 'a & b & c', 'a + b + c']) expect(title(bad)).toBe(false);
    });
});
