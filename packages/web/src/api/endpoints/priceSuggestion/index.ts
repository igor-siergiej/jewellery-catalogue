import { MethodType, type PriceSuggestion } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makePriceSuggestionRequest = (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<PriceSuggestion>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}/price-suggestion`,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'suggest a price',
            body: {},
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
