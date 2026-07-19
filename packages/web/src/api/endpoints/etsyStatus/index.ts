import { type Design, MethodType } from '@jewellery-catalogue/types';

import { getEtsyStatusEndpoint } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeRefreshEtsyStatusRequest = (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<Design>(
        {
            pathname: getEtsyStatusEndpoint(designId),
            method: MethodType.GET,
            operationString: 'refresh etsy status',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
