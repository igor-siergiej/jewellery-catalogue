import { makeRequestWithAutoRefresh } from '../../makeRequest';
import { MATERIALS_ENDPOINT } from '../../endpoints';
import { Material, MethodType } from '@jewellery-catalogue/types';

const makeGetMaterialsRequest = async (
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Array<Material>>(
        {
            pathname: MATERIALS_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch materials',
            accessToken,
        },
        onTokenRefresh,
        onTokenClear
    );
};

export const getMaterialsQuery = (
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => ({
    queryKey: ['materials'],
    queryFn: async () => makeGetMaterialsRequest(accessToken, onTokenRefresh, onTokenClear),
});
