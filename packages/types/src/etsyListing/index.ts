import { z } from 'zod';

export const ETSY_TITLE_MAX = 140;
export const ETSY_TAGS_MAX = 13;
export const ETSY_TAG_MAX_LENGTH = 20;

// Etsy tags may only contain letters, numbers, whitespace, -, ', ™, © and ®.
const ETSY_TAG_DISALLOWED = /[^\p{L}\p{N}\s\-'™©®]/gu;
const ETSY_TAG_PATTERN = /^[\p{L}\p{N} \-'™©®]+$/u;

/** Cleans a tag to Etsy's rules; null when nothing valid is left or it is too long. */
export const normaliseEtsyTag = (tag: string): string | null => {
    const cleaned = tag.toLowerCase().replace(ETSY_TAG_DISALLOWED, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.length > 0 && cleaned.length <= ETSY_TAG_MAX_LENGTH ? cleaned : null;
};

export const etsyTagSchema = z.string().min(1).max(ETSY_TAG_MAX_LENGTH).regex(ETSY_TAG_PATTERN);

export const etsyListingSchema = z.object({
    title: z.string().trim().min(1).max(ETSY_TITLE_MAX),
    description: z.string().trim().min(1),
    tags: z.array(etsyTagSchema).max(ETSY_TAGS_MAX),
});

export type EtsyListingCopy = z.infer<typeof etsyListingSchema>;
