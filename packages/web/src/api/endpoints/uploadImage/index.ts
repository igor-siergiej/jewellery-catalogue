import type { MethodType } from '@jewellery-catalogue/types';

import { IMAGES_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeUploadImageRequest = async (
    file: File,
    getAccessToken: () => string,
    onTokenRefresh: (token: string) => void,
    onTokenClear: () => void
): Promise<{ imageId: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    return makeRequestWithAutoRefresh<{ imageId: string }>(
        {
            pathname: IMAGES_ENDPOINT,
            method: 'POST' as unknown as MethodType,
            operationString: 'upload image',
            body: formData,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};
