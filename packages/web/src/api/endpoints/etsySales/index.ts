import { MethodType, type Sale } from '@jewellery-catalogue/types';

import { ETSY_UNMATCHED_SALES_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGetUnmatchedEtsySalesRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<Sale[]>(
        {
            pathname: ETSY_UNMATCHED_SALES_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch unmatched etsy sales',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
