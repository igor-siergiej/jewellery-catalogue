import { Control, UseFormRegister } from 'react-hook-form';
import { Material } from '../../../pages/Materials/types';

export interface IMaterialFormProps {
    register: UseFormRegister<Material>;
    control: Control<Material, any>;
}
