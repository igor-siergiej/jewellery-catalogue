import { FormMaterial, Material, MethodType } from '@jewellery-catalogue/types';

import { MATERIALS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

const makeAddMaterialRequest = async (
    material: FormMaterial,
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Array<Material>>(
        {
            pathname: MATERIALS_ENDPOINT,
            method: MethodType.POST,
            headers: {
                'Content-Type': 'application/json',
            },
            operationString: 'add materials',
            body: material,
            accessToken
        },
        onTokenRefresh,
        onTokenClear
    );
};

export default makeAddMaterialRequest;
