import { QueryClient } from '@tanstack/react-query';
import { makeRequestWithAutoRefresh } from '../../makeRequest';
import { Design, MethodType } from '@jewellery-catalogue/types';
import { DESIGNS_ENDPOINT } from '../../endpoints';

const makeGetDesignsRequest = async (
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Array<Design>>({
        pathname: DESIGNS_ENDPOINT,
        method: MethodType.GET,
        operationString: 'fetch designs',
        accessToken
    }, onTokenRefresh, onTokenClear);
};

export const getDesignsQuery = (
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => ({
    queryKey: ['designs'],
    queryFn: async () => makeGetDesignsRequest(accessToken, onTokenRefresh, onTokenClear),
});

export const designsLoader = (queryClient: QueryClient) => async (
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const result = await queryClient.fetchQuery({
        ...getDesignsQuery(accessToken, onTokenRefresh, onTokenClear),
    });
    return result;
};
