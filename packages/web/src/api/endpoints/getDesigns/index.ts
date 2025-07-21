import { QueryClient } from '@tanstack/react-query';
import { makeRequestWithAutoRefresh } from '../../makeRequest';
import { Design, MethodType } from '@jewellery-catalogue/types';
import { DESIGNS_ENDPOINT } from '../../endpoints';

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
