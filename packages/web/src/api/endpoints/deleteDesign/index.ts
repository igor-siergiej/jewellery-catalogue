import { MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeDeleteDesignRequest = async (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<{ message: string }>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}`,
            method: MethodType.DELETE,
            operationString: 'delete design',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export default makeDeleteDesignRequest;
