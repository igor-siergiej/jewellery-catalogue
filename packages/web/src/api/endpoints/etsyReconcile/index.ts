import { MethodType } from '@jewellery-catalogue/types';

import { ETSY_RECONCILE_CREATE_ENDPOINT, ETSY_RECONCILE_LINK_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeCreateDesignFromListingRequest = (
    listingId: number,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<{ designId: string }>(
        {
            pathname: ETSY_RECONCILE_CREATE_ENDPOINT,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'create design from etsy listing',
            body: { listingId },
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeLinkListingToDesignRequest = (
    listingId: number,
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<{ message: string }>(
        {
            pathname: ETSY_RECONCILE_LINK_ENDPOINT,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'link etsy listing to design',
            body: { listingId, designId },
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
