import { FormDesign, Material, MethodType } from '@jewellery-catalogue/types';
import { makeRequest } from '../../makeRequest';
import { DESIGNS_ENDPOINT } from '../../endpoints';

const makeAddDesignRequest = async (formDesign: FormDesign) => {
    const formData = new FormData();

    for (const key in formDesign) {
        if (Object.hasOwn(formDesign, key)) {
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

    return await makeRequest<Array<Material>>({
        pathname: DESIGNS_ENDPOINT,
        method: MethodType.POST,
        operationString: 'add design',
        body: formData
    });
};

export default makeAddDesignRequest;
