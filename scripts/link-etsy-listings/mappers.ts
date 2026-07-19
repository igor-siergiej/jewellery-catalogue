import Fuse from 'fuse.js';
import type { EtsyListingSummary } from '../../packages/api/src/domain/EtsyClient';
import type { Design } from '../../packages/types/src';

export interface LinkSuggestion {
    design: Design;
    listingId: number | null;
    listingTitle: string | null;
    score: number | null;
}

export const buildSuggestions = (designs: Design[], listings: EtsyListingSummary[]): LinkSuggestion[] => {
    const claimedListingIds = new Set(
        designs
            .filter((d): d is Design & { etsy: NonNullable<Design['etsy']> } => !!d.etsy?.listingId)
            .map((d) => d.etsy.listingId)
    );

    const suggestions: LinkSuggestion[] = [];

    for (const design of designs) {
        if (design.etsy?.listingId) continue;

        const availableListings = listings.filter((l) => !claimedListingIds.has(l.listingId));
        const fuse = new Fuse(availableListings, { keys: ['title'], threshold: 0.4, includeScore: true });
        const [bestMatch] = fuse.search(design.name);

        if (bestMatch) {
            claimedListingIds.add(bestMatch.item.listingId);
            suggestions.push({
                design,
                listingId: bestMatch.item.listingId,
                listingTitle: bestMatch.item.title,
                score: bestMatch.score ?? null,
            });
        } else {
            suggestions.push({ design, listingId: null, listingTitle: null, score: null });
        }
    }

    return suggestions;
};

export const applyOverrides = (
    suggestions: LinkSuggestion[],
    overrides: Record<string, number | null>,
    listings: EtsyListingSummary[]
): LinkSuggestion[] =>
    suggestions.map((s) => {
        if (!(s.design.id in overrides)) return s;

        const overrideListingId = overrides[s.design.id];
        if (overrideListingId === null) {
            return { ...s, listingId: null, listingTitle: null, score: null };
        }

        const listing = listings.find((l) => l.listingId === overrideListingId);
        return { ...s, listingId: overrideListingId, listingTitle: listing?.title ?? null, score: null };
    });

export const validateSuggestions = (suggestions: LinkSuggestion[]): string[] => {
    const errors: string[] = [];
    const seen = new Map<number, string>();

    for (const s of suggestions) {
        if (s.listingId === null) continue;

        const existingDesignName = seen.get(s.listingId);
        if (existingDesignName) {
            errors.push(
                `Listing ${s.listingId} is assigned to both "${existingDesignName}" and "${s.design.name}" — each listing can only link to one design.`
            );
        } else {
            seen.set(s.listingId, s.design.name);
        }
    }

    return errors;
};

export const formatSuggestionsTable = (suggestions: LinkSuggestion[]): string => {
    if (suggestions.length === 0) return '(no unlinked designs to suggest matches for)';

    const rows = suggestions.map((s, i) => {
        const target = s.listingId === null ? 'SKIP (no confident match)' : `#${s.listingId} — ${s.listingTitle}`;
        const scoreText = s.score === null ? '' : ` (score ${s.score.toFixed(2)})`;
        return `  [${i}] "${s.design.name}" (${s.design.id}) -> ${target}${scoreText}`;
    });

    return rows.join('\n');
};
