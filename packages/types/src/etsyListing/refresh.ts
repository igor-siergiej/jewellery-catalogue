import type { EtsyListingCopy } from './index';

export interface EtsyListingRefreshProposal {
    listingId: number;
    designId: string;
    designName: string;
    current: EtsyListingCopy;
    proposed: EtsyListingCopy;
}
