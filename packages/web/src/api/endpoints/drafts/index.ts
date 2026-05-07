import type { Draft, DraftType, MethodType } from '@jewellery-catalogue/types';

import { DRAFTS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

type AuthArgs = [() => string, (token: string) => void, () => void];

export const makeGetDraftsRequest = async (
    type: DraftType,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
): Promise<Array<Draft>> => {
    return makeRequestWithAutoRefresh<Array<Draft>>(
        {
            pathname: `${DRAFTS_ENDPOINT}?type=${type}`,
            method: 'GET' as unknown as MethodType,
            operationString: 'fetch drafts',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const getDraftsQuery = (type: DraftType, ...auth: AuthArgs) => ({
    queryKey: ['drafts', type],
    queryFn: async () => makeGetDraftsRequest(type, ...auth),
});

export const makeCreateDraftRequest = async (
    payload: { type: DraftType; name: string; data: Record<string, unknown> },
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
): Promise<Draft> => {
    return makeRequestWithAutoRefresh<Draft>(
        {
            pathname: DRAFTS_ENDPOINT,
            method: 'POST' as unknown as MethodType,
            operationString: 'create draft',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const makeUpdateDraftRequest = async (
    id: string,
    payload: { name: string; data: Record<string, unknown>; imageId?: string },
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
): Promise<Draft> => {
    return makeRequestWithAutoRefresh<Draft>(
        {
            pathname: `${DRAFTS_ENDPOINT}/${id}`,
            method: 'PUT' as unknown as MethodType,
            operationString: 'update draft',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const makeUploadDraftImageRequest = async (
    id: string,
    file: File,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
): Promise<Draft> => {
    const formData = new FormData();
    formData.append('file', file);

    return makeRequestWithAutoRefresh<Draft>(
        {
            pathname: `${DRAFTS_ENDPOINT}/${id}/image`,
            method: 'POST' as unknown as MethodType,
            operationString: 'upload draft image',
            body: formData,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export const makeDeleteDraftRequest = async (
    id: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
): Promise<void> => {
    await makeRequestWithAutoRefresh<void>(
        {
            pathname: `${DRAFTS_ENDPOINT}/${id}`,
            method: 'DELETE' as unknown as MethodType,
            operationString: 'delete draft',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};
