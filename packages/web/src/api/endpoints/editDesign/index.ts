import { type Design, type FormDesign, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeEditDesignRequest = async (
    designId: string,
    formDesign: Partial<FormDesign>,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const formData = new FormData();

    for (const key in formDesign) {
        if (Object.hasOwn(formDesign, key)) {
            const value = formDesign[key as keyof FormDesign];

            if (key === 'image' && value instanceof File) {
                formData.append('file', value);
            } else if (key === 'image' && typeof value === 'string') {
            } else if (key === 'materials' && Array.isArray(value)) {
                formData.append(key, JSON.stringify(value));
            } else if (typeof value === 'string' || typeof value === 'number') {
                formData.append(key, value.toString());
            }
        }
    }

    return await makeRequestWithAutoRefresh<Design>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}`,
            method: MethodType.PATCH,
            headers: {},
            operationString: 'edit design',
            body: formData,
            accessToken: '', // Will be replaced by getAccessToken()
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export default makeEditDesignRequest;
