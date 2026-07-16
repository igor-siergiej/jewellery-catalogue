import { type ImportRun, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_IMPORT_RUNS_ENDPOINT, getCancelImportRunEndpoint, getImportRunEndpoint } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGetImportRunsRequest = async (
    getAccessToken: () => string,
    onTokenRefresh: (t: string) => void,
    onTokenClear: () => void
): Promise<ImportRun[]> => {
    return await makeRequestWithAutoRefresh<ImportRun[]>(
        {
            pathname: DESIGNS_IMPORT_RUNS_ENDPOINT,
            method: MethodType.GET,
            operationString: 'get import runs',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const makeGetImportRunRequest = async (
    id: string,
    getAccessToken: () => string,
    onTokenRefresh: (t: string) => void,
    onTokenClear: () => void
): Promise<ImportRun> => {
    return await makeRequestWithAutoRefresh<ImportRun>(
        {
            pathname: getImportRunEndpoint(id),
            method: MethodType.GET,
            operationString: 'get import run',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const makeCancelImportRunRequest = async (
    id: string,
    getAccessToken: () => string,
    onTokenRefresh: (t: string) => void,
    onTokenClear: () => void
): Promise<ImportRun> => {
    return await makeRequestWithAutoRefresh<ImportRun>(
        {
            pathname: getCancelImportRunEndpoint(id),
            method: MethodType.POST,
            operationString: 'cancel import run',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};
