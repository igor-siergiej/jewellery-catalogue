import type { Material, MaterialType } from '@jewellery-catalogue/types';
import type { Control, UseFormReturn } from 'react-hook-form';

import UpdateBeadFields from './UpdateFields/Bead';
import UpdateChainFields from './UpdateFields/Chain';
import UpdateEarHookFields from './UpdateFields/EarHook';
import UpdateWireFields from './UpdateFields/Wire';

export interface IUpdateFormResolverProps {
    control: Control<any>;
    materialType: MaterialType;
    form: UseFormReturn<any>;
    material: Material;
}

const UpdateFormResolver: React.FC<IUpdateFormResolverProps> = ({ control, materialType, form, material }) => {
    switch (materialType) {
        case 'WIRE':
            return <UpdateWireFields control={control} form={form} material={material} />;
        case 'BEAD':
            return <UpdateBeadFields control={control} form={form} material={material} />;
        case 'CHAIN':
            return <UpdateChainFields control={control} form={form} material={material} />;
        case 'EAR_HOOK':
            return <UpdateEarHookFields control={control} form={form} material={material} />;
        default:
            return null;
    }
};

export default UpdateFormResolver;
