import { MaterialType } from '@jewellery-catalogue/types';

import AddBeadForm from './Forms/Bead';
import AddChainForm from './Forms/Chain';
import AddEarHookForm from './Forms/EarHook';
import AddWireForm from './Forms/Wire';
import {
    IMaterialFormResolverProps,
    IMaterialTypeToFormMapping,
} from './types';

const MATERIAL_TYPE_TO_FORM_MAPPING: IMaterialTypeToFormMapping = {
    [MaterialType.WIRE]: AddWireForm,
    [MaterialType.BEAD]: AddBeadForm,
    [MaterialType.EAR_HOOK]: AddEarHookForm,
    [MaterialType.CHAIN]: AddChainForm
} as const;

const content = (props: IMaterialFormResolverProps) => {
    const { materialType } = props;

    if (materialType in MATERIAL_TYPE_TO_FORM_MAPPING) {
        const FormComponent = MATERIAL_TYPE_TO_FORM_MAPPING[materialType];

        if (FormComponent) {
            return <FormComponent {...props} />;
        }
    }

    return null;
};

const MaterialFormResolver: React.FC<IMaterialFormResolverProps> = props => (
    <>{content(props)}</>
);

export default MaterialFormResolver;
