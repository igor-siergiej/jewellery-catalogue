import { type EtsyListingCopy, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGenerateEtsyListingRequest = (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyListingCopy>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}/etsy-listing/generate`,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'generate etsy listing copy',
            body: {},
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
