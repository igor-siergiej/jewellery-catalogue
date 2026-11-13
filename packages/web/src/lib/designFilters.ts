import { DesignType, type Design } from '@jewellery-catalogue/types';

import { type EtsyStatus, getEtsyStatus } from './etsyStatus';

export interface DesignFilters {
    type: DesignType | 'all';
    etsy: EtsyStatus | 'all';
}

const DESIGN_TYPES = Object.values(DesignType) as string[];
const ETSY_STATUSES: string[] = ['none', 'draft', 'listed', 'inactive'];

export function parseDesignFilters(params: URLSearchParams): DesignFilters {
    const type = params.get('type');
    const etsy = params.get('etsy');

    return {
        type: type && DESIGN_TYPES.includes(type) ? (type as DesignType) : 'all',
        etsy: etsy && ETSY_STATUSES.includes(etsy) ? (etsy as EtsyStatus) : 'all',
    };
}

export function toSearchParams(f: DesignFilters): URLSearchParams {
    const params = new URLSearchParams();

    if (f.type !== 'all') params.set('type', f.type);

    if (f.etsy !== 'all') params.set('etsy', f.etsy);

    return params;
}

// Catalogue-only designs are never Etsy work, so they don't count as "not on Etsy".
const matchesEtsy = (d: Design, etsy: EtsyStatus) =>
    etsy === 'none' ? getEtsyStatus(d) === 'none' && !d.catalogueOnly : getEtsyStatus(d) === etsy;

export function applyDesignFilters(designs: Design[], f: DesignFilters): Design[] {
    return designs.filter(
        (d) => (f.type === 'all' || d.designType === f.type) && (f.etsy === 'all' || matchesEtsy(d, f.etsy))
    );
}
