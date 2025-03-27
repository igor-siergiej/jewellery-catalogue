import { QueryClient } from '@tanstack/react-query';
import { makeRequest } from '../../makeRequest';
import { MATERIALS_ENDPOINT } from '../../endpoints';
import { Material, MethodType } from 'types';

const makeGetMaterialsRequest = async () => {
    return await makeRequest<Array<Material>>({ pathname: MATERIALS_ENDPOINT, method: MethodType.GET, operationString: 'fetch materials' });
};

export const getMaterialsQuery = () => ({
    queryKey: ['materials'],
    queryFn: async () => makeGetMaterialsRequest(),
});

export const materialsLoader = (queryClient: QueryClient) => async () => {
    const result = await queryClient.fetchQuery({
        ...getMaterialsQuery(),
    });
    return result;
};
