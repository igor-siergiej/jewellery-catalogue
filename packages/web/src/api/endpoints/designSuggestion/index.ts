import { type DesignSuggestion, MethodType } from '@jewellery-catalogue/types';

import { SUGGEST_DESIGN_FROM_PHOTO_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeSuggestDesignFromPhotoRequest = (
    images: Array<File | string>,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const body = new FormData();
    for (const image of images) {
        if (image instanceof File) body.append('files', image);
        else body.append('imageIds', image);
    }

    return makeRequestWithAutoRefresh<DesignSuggestion>(
        {
            pathname: SUGGEST_DESIGN_FROM_PHOTO_ENDPOINT,
            method: MethodType.POST,
            operationString: 'suggest design from photo',
            body,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};
