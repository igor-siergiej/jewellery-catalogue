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

    const images = formDesign.images ?? [];
    const keepImageIds = images.filter((v): v is string => typeof v === 'string');
    const newFiles = images.filter((v): v is File => v instanceof File);

    for (const file of newFiles) {
        formData.append('files', file);
    }

    formData.append('keepImageIds', JSON.stringify(keepImageIds));

    const diagramImages = formDesign.diagramImages ?? [];
    const keepDiagramImageIds = diagramImages.filter((v): v is string => typeof v === 'string');
    const newDiagramFiles = diagramImages.filter((v): v is File => v instanceof File);

    for (const file of newDiagramFiles) {
        formData.append('diagramFiles', file);
    }

    formData.append('keepDiagramImageIds', JSON.stringify(keepDiagramImageIds));

    for (const key in formDesign) {
        if (Object.hasOwn(formDesign, key)) {
            const value = formDesign[key as keyof FormDesign];

            if (key === 'images' || key === 'diagramImages') {
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

    return await makeRequestWithAutoRefresh<Design>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}`,
            method: MethodType.PATCH,
            headers: {},
            operationString: 'edit design',
            body: formData,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};

export default makeEditDesignRequest;
