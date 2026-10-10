import { type EtsyListingCopy, type EtsyListingRefreshProposal, MethodType } from '@jewellery-catalogue/types';

import { ETSY_LISTINGS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeProposeListingCopyRequest = (
    listingId: number,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyListingRefreshProposal>(
        {
            pathname: `${ETSY_LISTINGS_ENDPOINT}/${listingId}/copy/propose`,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'generate new listing copy',
            body: {},
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeApplyListingCopyRequest = (
    listingId: number,
    copy: EtsyListingCopy,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<{ updated: boolean }>(
        {
            pathname: `${ETSY_LISTINGS_ENDPOINT}/${listingId}/copy`,
            method: MethodType.PUT,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'update listing on Etsy',
            body: copy,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
