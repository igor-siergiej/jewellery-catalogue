import { QueryClient } from '@tanstack/react-query';
import { makeRequest } from '../../makeRequest';
import { Design, MethodType } from 'types';
import { DESIGNS_ENDPOINT } from '../../endpoints';

const makeGetDesignsRequest = async () => {
    return await makeRequest<Array<Design>>({ pathname: DESIGNS_ENDPOINT, method: MethodType.GET, operationString: 'fetch designs' });
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
