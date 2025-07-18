import { FormMaterial, Material, MethodType } from '@jewellery-catalogue/types';
import { makeRequestWithAutoRefresh } from '../../makeRequest';
import { MATERIALS_ENDPOINT } from '../../endpoints';

const makeAddMaterialRequest = async (
    catalogueId: string,
    material: FormMaterial,
    accessToken: string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    return await makeRequestWithAutoRefresh<Array<Material>>(
        {
            pathname: `${MATERIALS_ENDPOINT}/${catalogueId}`,
            method: MethodType.POST,
            operationString: 'add materials',
            body: material,
            accessToken
        },
        onTokenRefresh,
        onTokenClear
    );
};

export default makeAddMaterialRequest;
