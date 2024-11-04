import { Material } from '../../types';
import { IGenericResponse } from '../types';
const URI = '/api/materials';

const makeAddMaterialRequest = async (material: Material) => {
    const url = `${window.origin}${URI}`;

    const response = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(material),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const responseJson = (await response.json()) as IGenericResponse;

    return responseJson;
};

export default makeAddMaterialRequest;
