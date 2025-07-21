/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormMaterial } from '@jewellery-catalogue/types';
import { Control, UseFormRegister } from 'react-hook-form';

export interface IMaterialFormProps {
    register: UseFormRegister<FormMaterial>;
    control: Control<FormMaterial, any>;
}
