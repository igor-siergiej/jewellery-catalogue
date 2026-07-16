import {
    type ImportCommitRequest,
    type ImportCommitResponse,
    type ImportPreviewResult,
    MethodType,
} from '@jewellery-catalogue/types';
import { DESIGNS_IMPORT_COMMIT_ENDPOINT, DESIGNS_IMPORT_PREVIEW_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makePreviewImportRequest = async (
    file: File,
    getAccessToken: () => string,
    onTokenRefresh: (t: string) => void,
    onTokenClear: () => void
): Promise<ImportPreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return await makeRequestWithAutoRefresh<ImportPreviewResult>(
        {
            pathname: DESIGNS_IMPORT_PREVIEW_ENDPOINT,
            method: MethodType.POST,
            headers: {},
            operationString: 'preview Etsy import',
            body: formData,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const makeCommitImportRequest = async (
    request: ImportCommitRequest,
    getAccessToken: () => string,
    onTokenRefresh: (t: string) => void,
    onTokenClear: () => void
): Promise<ImportCommitResponse> => {
    return await makeRequestWithAutoRefresh<ImportCommitResponse>(
        {
            pathname: DESIGNS_IMPORT_COMMIT_ENDPOINT,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'commit Etsy import',
            body: request,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};
