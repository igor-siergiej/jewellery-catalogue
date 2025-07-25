import { Material, MethodType } from '@jewellery-catalogue/types';

import { MATERIALS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeGetMaterialsRequest = async (
    catalogueId: string,
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Array<Material>>(
        {
            pathname: `${MATERIALS_ENDPOINT}/${catalogueId}`,
            method: MethodType.GET,
            operationString: 'fetch materials',
            accessToken,
        },
        onTokenRefresh,
        onTokenClear
    );
};

export const getMaterialsQuery = (
    catalogueId: string,
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => ({
    queryKey: ['materials', catalogueId],
    queryFn: async () => makeGetMaterialsRequest(catalogueId, accessToken, onTokenRefresh, onTokenClear),
});
