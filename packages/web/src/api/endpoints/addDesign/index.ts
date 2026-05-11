import { type FormDesign, type Material, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeAddDesignRequest = async (
    formDesign: FormDesign,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const formData = new FormData();

    const images = formDesign.images ?? [];
    const existingImageIds = images.filter((v): v is string => typeof v === 'string');
    const newFiles = images.filter((v): v is File => v instanceof File);

    for (const file of newFiles) {
        formData.append('files', file);
    }

    if (existingImageIds.length > 0) {
        formData.append('existingImageIds', JSON.stringify(existingImageIds));
    }

    for (const key in formDesign) {
        if (Object.hasOwn(formDesign, key)) {
            const value = formDesign[key as keyof typeof formDesign];

            if (key === 'images') {
                // handled above
            } else if (
                (key === 'materials' || key === 'variationGroups' || key === 'variants') &&
                Array.isArray(value)
            ) {
                formData.append(key, JSON.stringify(value));
            } else if (typeof value === 'string' || typeof value === 'number') {
                formData.append(key, value.toString());
            }
        }
    }

    return await makeRequestWithAutoRefresh<Array<Material>>(
        {
            pathname: DESIGNS_ENDPOINT,
            method: MethodType.POST,
            headers: {},
            operationString: 'add design',
            body: formData,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export default makeAddDesignRequest;
