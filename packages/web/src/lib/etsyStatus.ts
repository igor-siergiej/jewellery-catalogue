import type { Design } from '@jewellery-catalogue/types';

export type EtsyStatus = 'none' | 'draft' | 'listed' | 'inactive';

export const ETSY_STATUS_LABEL: Record<EtsyStatus, string> = {
    none: 'Not on Etsy',
    draft: 'Etsy draft',
    listed: 'Listed',
    inactive: 'Inactive',
};

export function getEtsyStatus(design: Pick<Design, 'etsy'>): EtsyStatus {
    switch (design.etsy?.state) {
        case 'draft':
            return 'draft';
        case 'active':
            return 'listed';
        case 'inactive':
            return 'inactive';
        default:
            return 'none';
    }
}

export function isNotOnEtsyYet(design: Pick<Design, 'etsy' | 'catalogueOnly'>): boolean {
    return !design.etsy && !design.catalogueOnly;
}

export type EtsyAction = 'send' | 'view' | 'catalogue-only' | 'none';

/** The one action the View Design Etsy block offers. */
export function getEtsyAction(design: Pick<Design, 'etsy' | 'catalogueOnly'>, connected: boolean): EtsyAction {
    if (design.catalogueOnly) return 'catalogue-only';

    const { etsy } = design;
    const status = getEtsyStatus(design);

    if (status === 'none' || (status === 'draft' && (etsy?.pushIncomplete || !etsy?.listingId))) {
        return connected ? 'send' : 'none';
    }

    return etsy?.listingId ? 'view' : 'none';
}

export const etsyListingUrl = (listingId: number): string =>
    `https://www.etsy.com/your/shops/me/listing-editor/edit/${listingId}`;
