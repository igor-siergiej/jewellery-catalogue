import { type Design, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeGetDesignRequest = async (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Design>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}`,
            method: MethodType.GET,
            operationString: 'fetch design',
            accessToken: '', // Will be replaced by getAccessToken()
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const getDesignQuery = (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => ({
    queryKey: ['design', designId],
    queryFn: async () => makeGetDesignRequest(designId, getAccessToken, onTokenRefresh, onTokenClear),
});
