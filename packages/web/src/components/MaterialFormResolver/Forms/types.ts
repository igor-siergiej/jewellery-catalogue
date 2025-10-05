/* eslint-disable @typescript-eslint/no-explicit-any */
import { Control, UseFormReturn } from 'react-hook-form';

import { AddMaterialFormData } from '@/schemas/addMaterialSchema';

export interface IMaterialFormProps {
    control: Control<AddMaterialFormData, any>;
    form: UseFormReturn<AddMaterialFormData>;
}
