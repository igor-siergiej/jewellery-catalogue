import { type Material, MethodType, type UpdateMaterial } from '@jewellery-catalogue/types';

import { MATERIALS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeUpdateMaterialRequest = async (
    materialId: string,
    updates: UpdateMaterial,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Material>(
        {
            pathname: `${MATERIALS_ENDPOINT}/${materialId}`,
            method: MethodType.PUT,
            headers: {
                'Content-Type': 'application/json',
            },
            operationString: 'update material',
            body: updates,
            accessToken: '', // Will be replaced by getAccessToken()
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export default makeUpdateMaterialRequest;
