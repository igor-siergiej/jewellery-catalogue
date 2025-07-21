import { FormDesign, Material, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeAddDesignRequest = async (
    catalogueId: string,
    formDesign: FormDesign,
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const formData = new FormData();

    for (const key in formDesign) {
        if (Object.prototype.hasOwnProperty.call(formDesign, key)) {
            const value = formDesign[key as keyof FormDesign];

            if (key === 'image' && value instanceof File) {
                formData.append('file', value);
            } else if (key === 'materials' && Array.isArray(value)) {
                formData.append(key, JSON.stringify(value));
            } else if (typeof value === 'string' || typeof value === 'number') {
                formData.append(key, value.toString());
            }
        }
    }

    return await makeRequestWithAutoRefresh<Array<Material>>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${catalogueId}`,
            method: MethodType.POST,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            operationString: 'add design',
            body: formData,
            accessToken
        },
        onTokenRefresh,
        onTokenClear
    );
};

export default makeAddDesignRequest;
