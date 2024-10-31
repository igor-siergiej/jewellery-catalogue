import { MaterialType } from '../../pages/Materials/types';
import { IMaterialTypeToFormMapping, IProps } from './types';
import AddWireForm from './Forms/Wire';
import AddBeadForm from './Forms/Bead';

const MATERIAL_TYPE_TO_FORM_MAPPING: IMaterialTypeToFormMapping = {
    [MaterialType.WIRE]: AddWireForm,
    [MaterialType.BEAD]: AddBeadForm,
} as const;

const content = (props: IProps) => {
    const { materialType } = props;

    console.log(materialType);

    if (materialType in MATERIAL_TYPE_TO_FORM_MAPPING) {
        const FormComponent = MATERIAL_TYPE_TO_FORM_MAPPING[materialType];

        if (FormComponent) {
            return <FormComponent {...props} />;
        }
    }

    return null;
};

const MaterialFormResolver: React.FC<IProps> = (props) => <>{content(props)}</>;

export default MaterialFormResolver;
