import { Design, MethodType } from '@jewellery-catalogue/types';
import { QueryClient } from '@tanstack/react-query';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeGetDesignsRequest = async (
    catalogueId: string,
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Array<Design>>({
        pathname: `${DESIGNS_ENDPOINT}/${catalogueId}`,
        method: MethodType.GET,
        operationString: 'fetch designs',
        accessToken
    }, onTokenRefresh, onTokenClear);
};

export const getDesignsQuery = (
    catalogueId: string,
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => ({
    queryKey: ['designs', catalogueId],
    queryFn: async () => makeGetDesignsRequest(catalogueId, accessToken, onTokenRefresh, onTokenClear),
});

export const designsLoader = (queryClient: QueryClient) => async (
    catalogueId: string,
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const result = await queryClient.fetchQuery({
        ...getDesignsQuery(catalogueId, accessToken, onTokenRefresh, onTokenClear),
    });
    return result;
};
