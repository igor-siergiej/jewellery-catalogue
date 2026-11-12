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

export type EtsyAction = 'send' | 'view' | 'catalogue-only';

/**
 * The actions the View Design Etsy block offers. An incomplete push (for example a design created from an Etsy
 * listing) can always be sent again, whatever its state, and keeps its link to the listing.
 */
export function getEtsyAction(design: Pick<Design, 'etsy' | 'catalogueOnly'>, connected: boolean): EtsyAction[] {
    if (design.catalogueOnly) return ['catalogue-only'];

    const { etsy } = design;
    const status = getEtsyStatus(design);
    const needsPush = status === 'none' || !!etsy?.pushIncomplete || (status === 'draft' && !etsy?.listingId);
    const actions: EtsyAction[] = [];

    if (needsPush && connected) actions.push('send');

    if (etsy?.listingId) actions.push('view');

    return actions;
}

export const etsyListingUrl = (listingId: number): string =>
    `https://www.etsy.com/your/shops/me/listing-editor/edit/${listingId}`;
