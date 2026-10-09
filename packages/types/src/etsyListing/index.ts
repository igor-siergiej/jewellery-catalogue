import { z } from 'zod';

export const ETSY_TITLE_MAX = 140;
export const ETSY_TAGS_MAX = 13;
export const ETSY_TAG_MAX_LENGTH = 20;

// Etsy tags may only contain letters, decimal digits, whitespace, -, ', ™, © and ®.
const ETSY_TAG_DISALLOWED = /[^\p{L}\p{Nd}\s\-'™©®]/gu;
const ETSY_TAG_PATTERN = /^[\p{L}\p{Nd} \-'™©®]+$/u;

// Etsy titles may only contain letters, decimal digits, punctuation, maths symbols, spaces, ™, © and ®,
// and each of %, :, & and + at most once.
export const ETSY_TITLE_DISALLOWED = /[^\p{L}\p{Nd}\p{P}\p{Sm}\p{Zs}™©®]/gu;
export const ETSY_TITLE_ONCE_CHARS = ['%', ':', '&', '+'] as const;

/** True when every character is allowed in an Etsy title and %, :, &, + each appear at most once. */
export const isValidEtsyTitleChars = (title: string): boolean =>
    !new RegExp(ETSY_TITLE_DISALLOWED.source, 'u').test(title) &&
    ETSY_TITLE_ONCE_CHARS.every((ch) => title.split(ch).length <= 2);

/** Replaces characters Etsy disallows in titles, and repeats of %, :, &, +, with spaces. */
export const replaceInvalidEtsyTitleChars = (title: string): string => {
    const seen = new Set<string>();
    return title.replace(ETSY_TITLE_DISALLOWED, ' ').replace(/[%:&+]/g, (ch) => {
        if (seen.has(ch)) return ' ';
        seen.add(ch);
        return ch;
    });
};

/** Cleans a tag to Etsy's rules; null when nothing valid is left or it is too long. */
export const normaliseEtsyTag = (tag: string): string | null => {
    const cleaned = tag.toLowerCase().replace(ETSY_TAG_DISALLOWED, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.length > 0 && cleaned.length <= ETSY_TAG_MAX_LENGTH ? cleaned : null;
};

export const etsyTagSchema = z.string().min(1).max(ETSY_TAG_MAX_LENGTH).regex(ETSY_TAG_PATTERN);

export const etsyListingSchema = z.object({
    title: z.string().trim().min(1).max(ETSY_TITLE_MAX).refine(isValidEtsyTitleChars, {
        message: 'Etsy titles can use %, :, & and + once each and no emoji or currency symbols',
    }),
    description: z.string().trim().min(1),
    tags: z.array(etsyTagSchema).max(ETSY_TAGS_MAX),
});

export type EtsyListingCopy = z.infer<typeof etsyListingSchema>;
