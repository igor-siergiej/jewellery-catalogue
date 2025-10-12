import { type Material, MethodType } from '@jewellery-catalogue/types';

import { MATERIALS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeGetMaterialsRequest = async (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Array<Material>>(
        {
            pathname: MATERIALS_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch materials',
            accessToken: '', // Will be replaced by getAccessToken()
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const getMaterialsQuery = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => ({
    queryKey: ['materials'],
    queryFn: async () => makeGetMaterialsRequest(getAccessToken, onTokenRefresh, onTokenClear),
});
