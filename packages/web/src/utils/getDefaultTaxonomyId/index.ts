import { DesignType } from '@jewellery-catalogue/types';

import type { FlatTaxonomyOption } from '../flattenTaxonomyNodes';

// Etsy taxonomy IDs aren't stable across shops/regions, so match on the leaf
// category name from the shop's own live taxonomy list instead of a hardcoded ID.
const CATEGORY_NAME_CANDIDATES: Record<DesignType, string[]> = {
    [DesignType.EARRINGS]: ['Earrings'],
    [DesignType.EARCUFF]: ['Ear Cuffs', 'Earrings'],
    [DesignType.RING]: ['Rings'],
    [DesignType.NECKLACE]: ['Necklaces'],
    [DesignType.BRACELET]: ['Bracelets'],
};

const leafName = (label: string) => label.split(' > ').at(-1) ?? label;

export const getDefaultTaxonomyId = (designType: DesignType, options: FlatTaxonomyOption[]): number | undefined => {
    for (const candidate of CATEGORY_NAME_CANDIDATES[designType]) {
        const match = options.find((opt) => leafName(opt.label).toLowerCase() === candidate.toLowerCase());
        if (match) return match.id;
    }
    return undefined;
};
