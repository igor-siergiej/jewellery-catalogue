import { FormDesign, Material } from '@jewellery-catalogue/types';
import { UseFormSetValue } from 'react-hook-form';

export interface TableMaterial {
    rowKey: string;
    name: string;
    id: string;
    required: number;
    isNew?: boolean;
    isEditing?: boolean;
};

export interface AddMaterialsTableProps {
    setValue: UseFormSetValue<FormDesign>;
    availableMaterials: Array<Material>;
    hasError?: boolean;
}
