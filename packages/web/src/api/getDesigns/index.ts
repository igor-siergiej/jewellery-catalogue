import { DESIGNS_ENDPOINT } from '../endpoints';
import { getApiUrl } from '../getApiUrl';
import { GetDesignsResponse } from './types';
import { QueryClient } from '@tanstack/react-query';

const makeGetDesignsRequest = async () => {
    const url = `${getApiUrl()}${DESIGNS_ENDPOINT}`;

    const response = await fetch(url);

    const responseJson = (await response.json()) as GetDesignsResponse;

    return responseJson.body;
};

export const getDesignsQuery = () => ({
    queryKey: ['designs'],
    queryFn: async () => makeGetDesignsRequest(),
});

export const designsLoader = (queryClient: QueryClient) => async () => {
    const result = await queryClient.fetchQuery({
        ...getDesignsQuery(),
    });
    return result;
};
