import { QueryClient } from '@tanstack/react-query';
import { MATERIALS_ENDPOINT } from '../endpoints';
import { GetMaterialsResponse } from './types';
import { getApiUrl } from '../getApiUrl';

const makeGetMaterialsRequest = async () => {
    const url = `${getApiUrl()}${MATERIALS_ENDPOINT}`;

    const response = await fetch(url);

    const responseJson = (await response.json()) as GetMaterialsResponse;

    return responseJson.body;
};

export const getMaterialsQuery = () => ({
    queryKey: ['designs'],
    queryFn: async () => makeGetMaterialsRequest(),
});

export const materialsLoader = (queryClient: QueryClient) => async () => {
    const result = await queryClient.fetchQuery({
        ...getMaterialsQuery(),
    });
    return result;
};
