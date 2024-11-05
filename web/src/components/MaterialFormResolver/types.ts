import { MaterialType } from '../../types';
import { IMaterialFormProps } from './Forms/types';

export interface IMaterialTypeToFormMapping {
    [key: string]: React.FC<IMaterialFormProps>;
}

export interface IProps extends IMaterialFormProps {
    materialType: MaterialType;
}
