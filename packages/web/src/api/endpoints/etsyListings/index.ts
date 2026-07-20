import { MethodType } from '@jewellery-catalogue/types';

import { ETSY_LISTINGS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export interface EtsyListingWithLinkStatus {
    listingId: number;
    title: string;
    price: number;
    url: string;
    state: 'active' | 'sold_out';
    imageUrl: string | null;
    linkedDesignId: string | null;
}

export const makeGetEtsyListingsRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyListingWithLinkStatus[]>(
        {
            pathname: ETSY_LISTINGS_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch etsy shop listings',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
