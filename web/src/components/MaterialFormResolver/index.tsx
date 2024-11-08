import {
    IMaterialFormResolverProps,
    IMaterialTypeToFormMapping,
} from './types';
import AddWireForm from './Forms/Wire';
import AddBeadForm from './Forms/Bead';
import { MaterialType } from '../../types';

const MATERIAL_TYPE_TO_FORM_MAPPING: IMaterialTypeToFormMapping = {
    [MaterialType.WIRE]: AddWireForm,
    [MaterialType.BEAD]: AddBeadForm,
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

const MaterialFormResolver: React.FC<IMaterialFormResolverProps> = (props) => (
    <>{content(props)}</>
);

export default MaterialFormResolver;
