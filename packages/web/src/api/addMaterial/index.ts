import { Bead, Wire } from 'types';
import { MATERIALS_ENDPOINT } from '../endpoints';
import { getApiUrl } from '../getApiUrl';
import { IGenericResponse } from '../types';

const makeAddMaterialRequest = async (material: Wire | Bead) => {
    console.log(material);
    const url = `${getApiUrl()}${MATERIALS_ENDPOINT}`;

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
