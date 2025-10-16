import { type Design, MethodType, type UpdateDesign } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeUpdateDesignRequest = async (
    designId: string,
    updates: UpdateDesign,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Design>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}`,
            method: MethodType.PUT,
            headers: {
                'Content-Type': 'application/json',
            },
            operationString: 'update design',
            body: updates,
            accessToken: '', // Will be replaced by getAccessToken()
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export default makeUpdateDesignRequest;
