import { MethodType } from '@jewellery-catalogue/types';

import { MATERIALS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeDeleteMaterialRequest = async (
    materialId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<{ message: string }>(
        {
            pathname: `${MATERIALS_ENDPOINT}/${materialId}`,
            method: MethodType.DELETE,
            operationString: 'delete material',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export default makeDeleteMaterialRequest;
