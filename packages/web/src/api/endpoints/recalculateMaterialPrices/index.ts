import { MethodType } from '@jewellery-catalogue/types';

import { getMaterialRecalculatePricesEndpoint } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeRecalculateMaterialPricesRequest = async (
    materialId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<{ updated: number; total: number }>(
        {
            pathname: getMaterialRecalculatePricesEndpoint(materialId),
            method: MethodType.POST,
            headers: {
                'Content-Type': 'application/json',
            },
            operationString: 'recalculate material prices',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export default makeRecalculateMaterialPricesRequest;
