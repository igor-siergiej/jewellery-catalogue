import { FormDesign, Material } from '@jewellery-catalogue/types';
import { UseFormSetValue } from 'react-hook-form';

export interface IAddMaterialFieldsProps {
    availableMaterials: Array<Material>;
    setCurrentMaterials: (materials: Array<Material>) => void;
    currentMaterials: Array<Material>;
    setValue: UseFormSetValue<FormDesign>;
}

export interface ISelectMaterial {
    materialName: string;
    amount: number;
}
