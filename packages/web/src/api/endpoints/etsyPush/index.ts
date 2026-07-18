import { type Design, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makePushDesignToEtsyRequest = (
    designId: string,
    overrides: { description?: string; price?: number },
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<Design>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}/etsy-push`,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'push design to etsy',
            body: overrides,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
