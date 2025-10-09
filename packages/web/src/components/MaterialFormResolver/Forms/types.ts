/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Control, UseFormReturn } from 'react-hook-form';

import type { AddMaterialFormData } from '@/schemas/addMaterialSchema';

export interface IMaterialFormProps {
    control: Control<AddMaterialFormData, any>;
    form: UseFormReturn<AddMaterialFormData>;
}
