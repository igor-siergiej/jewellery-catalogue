import { Bead, Material, MethodType, Wire } from '@jewellery-catalogue/types';
import { makeRequest } from '../../makeRequest';
import { MATERIALS_ENDPOINT } from '../../endpoints';

const makeAddMaterialRequest = async (material: Wire | Bead) => {
    return await makeRequest<Array<Material>>({
        pathname: MATERIALS_ENDPOINT,
        method: MethodType.POST,
        operationString: 'add materials',
        headers: {
            'Content-Type': 'application/json'
        },
        body: material
    });
};

export default makeAddMaterialRequest;
