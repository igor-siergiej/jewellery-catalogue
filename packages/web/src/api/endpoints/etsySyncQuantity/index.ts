import { type Design, MethodType } from '@jewellery-catalogue/types';

import { getEtsySyncQuantityEndpoint } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeSyncEtsyQuantityRequest = (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<Design>(
        {
            pathname: getEtsySyncQuantityEndpoint(designId),
            method: MethodType.POST,
            operationString: 'sync etsy quantity',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
