import { type Design, MethodType } from '@jewellery-catalogue/types';
import type { QueryClient } from '@tanstack/react-query';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeGetDesignsRequest = async (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Array<Design>>(
        {
            pathname: DESIGNS_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch designs',
            accessToken: '', // Will be replaced by getAccessToken()
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const getDesignsQuery = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => ({
    queryKey: ['designs'],
    queryFn: async () => makeGetDesignsRequest(getAccessToken, onTokenRefresh, onTokenClear),
});

export const designsLoader =
    (queryClient: QueryClient) =>
    async (getAccessToken: () => string, onTokenRefresh: (newToken: string) => void, onTokenClear: () => void) => {
        const result = await queryClient.fetchQuery({
            ...getDesignsQuery(getAccessToken, onTokenRefresh, onTokenClear),
        });

        return result;
    };
