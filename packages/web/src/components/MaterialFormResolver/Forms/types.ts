import { Control, UseFormRegister } from 'react-hook-form';
import { IFormMaterial } from '../../../pages/AddMaterial/types';

export interface IMaterialFormProps {
    register: UseFormRegister<IFormMaterial>;
    control: Control<IFormMaterial, any>;
}
