import {
    type Design,
    DesignType,
    ETSY_TAG_MAX_LENGTH,
    ETSY_TAGS_MAX,
    ETSY_TITLE_MAX,
    type EtsyListingCopy,
    htmlToPlainText,
    MaterialType,
    METAL_TYPE,
    normaliseEtsyTag,
    type RequiredMaterial,
    WIRE_TYPE,
} from '@jewellery-catalogue/types';
import { z } from 'zod';

const DESIGN_TYPE_LABEL: Record<DesignType, string> = {
    [DesignType.EARRINGS]: 'earrings',
    [DesignType.EARCUFF]: 'ear cuff',
    [DesignType.RING]: 'ring',
    [DesignType.NECKLACE]: 'necklace',
    [DesignType.BRACELET]: 'bracelet',
};

// FULL is deliberately just the metal name: "solid silver" is a hallmarking claim we can't verify.
// GILT already means gold-coated, so it is never qualified by the wire type.
const metalLabel = (wireType: WIRE_TYPE, metalType: METAL_TYPE): string => {
    if (metalType === METAL_TYPE.GILT) return 'gilt';
    const metal = metalType.toLowerCase();
    if (wireType === WIRE_TYPE.FILLED) return `${metal} filled`;
    if (wireType === WIRE_TYPE.PLATED) return `${metal} plated`;
    return metal;
};

const describeMaterial = (m: RequiredMaterial, designType: DesignType | undefined): string => {
    switch (m.type) {
        case MaterialType.BEAD:
            return `Bead: ${m.name} — colour ${m.colour}, ${m.diameter}mm diameter, ${m.requiredQuantity} used`;
        case MaterialType.WIRE:
            return `Wire: ${m.name} — ${metalLabel(m.wireType, m.metalType)}, ${m.diameter}mm thick (${m.requiredLength}cm of wire used to make it; not a finished size)`;
        case MaterialType.CHAIN:
            return `Chain: ${m.name} — ${metalLabel(m.wireType, m.metalType)}, ${m.diameter}mm links, ${m.requiredLength}cm of chain used (${
                designType === DesignType.NECKLACE || designType === DesignType.BRACELET
                    ? 'approximate finished length'
                    : 'material used; not a finished size'
            })`;
        case MaterialType.EAR_HOOK:
            return `Ear hooks: ${m.name} — ${metalLabel(m.wireType, m.metalType)}`;
    }
};

export const buildListingPrompt = (design: Design, photoCount: number): string => {
    const lines = [
        `Item name: ${design.name}`,
        `Item type: ${design.designType ? DESIGN_TYPE_LABEL[design.designType] : 'jewellery (type not set)'}`,
        `Maker's description: ${htmlToPlainText(design.description).trim() || '(none)'}`,
        'Materials:',
        ...(design.materials.length > 0
            ? design.materials.map((m) => `- ${describeMaterial(m, design.designType)}`)
            : ['- (none recorded)']),
    ];

    const groups = design.variationGroups ?? [];
    if (groups.length > 0) {
        lines.push('Variations offered:');
        for (const group of groups) {
            lines.push(`- ${group.name}: ${group.options.map((o) => o.material.name).join(', ')}`);
        }
    }

    lines.push(`Photos attached: ${photoCount}`);
    lines.push('', 'Write the Etsy listing JSON for this item.');
    return lines.join('\n');
};

export const LISTING_SYSTEM_PROMPT = `You are an Etsy SEO copywriter for a small UK shop selling handmade jewellery. Write in British English.

Use ONLY the facts provided and what is clearly visible in the photos. Never invent gemstones, metals, hallmarks, sizes or measurements. If a bead's material is not stated, describe its colour and shape instead of naming a stone. Lengths of chain or wire used are NOT finished dimensions unless the facts explicitly say "approximate finished length"; bead diameter may be stated. Do not state any other sizes.

Return ONLY a JSON object, no markdown or prose: {"title": string, "description": string, "tags": string[]}

title:
- At most ${ETSY_TITLE_MAX} characters. Put the phrase a shopper would search first, e.g. "Silver Wire Wrapped Amethyst Drop Earrings".
- Then material, colour, style and gift context, reading naturally. No keyword stuffing, no repeated words, no ALL CAPS.
- Use at most one each of the characters % : &.

tags:
- Exactly ${ETSY_TAGS_MAX} distinct tags, each at most ${ETSY_TAG_MAX_LENGTH} characters including spaces.
- Only letters, numbers, spaces, hyphens and apostrophes.
- Multi-word phrases shoppers type: item type, material, colour, style, stone or bead, occasion and recipient (e.g. "gift for her").
- Don't just repeat the title word for word.

description (plain text, no markdown, no emoji):
- First 1-2 sentences: a hook containing the main search keywords.
- Then a details section: materials, colours, approximate size only if known, and the variations offered.
- End with a short care note and a handmade / gift-ready note.`;

const truncateAtWord = (text: string, max: number): string => {
    if (text.length <= max) return text;
    const lastSpace = text.slice(0, max + 1).lastIndexOf(' ');
    const cut = lastSpace > 0 ? text.slice(0, lastSpace) : text.slice(0, max);
    return cut.replace(/[\s,|:&-]+$/, '');
};

const keepFirstSpecialChars = (title: string): string => {
    const seen = new Set<string>();
    return title.replace(/[%:&]/g, (ch) => {
        if (seen.has(ch)) return ' ';
        seen.add(ch);
        return ch;
    });
};

export const sanitiseListingCopy = (raw: { title: string; description: string; tags: string[] }): EtsyListingCopy => {
    const tags: string[] = [];
    for (const candidate of raw.tags) {
        const tag = normaliseEtsyTag(candidate);
        if (!tag || tags.includes(tag)) continue;
        tags.push(tag);
        if (tags.length === ETSY_TAGS_MAX) break;
    }

    return {
        title: truncateAtWord(keepFirstSpecialChars(raw.title).replace(/\s+/g, ' ').trim(), ETSY_TITLE_MAX),
        description: raw.description
            .replace(/\r\n?/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
        tags,
    };
};

export const listingCopyReplySchema = z
    .object({ title: z.string(), description: z.string(), tags: z.array(z.string()) })
    .transform(sanitiseListingCopy)
    .refine((copy) => copy.title.length > 0 && copy.description.length > 0, {
        message: 'title and description must be non-empty',
    });
