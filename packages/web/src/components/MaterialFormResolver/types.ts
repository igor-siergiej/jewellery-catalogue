import type { MaterialType } from '@jewellery-catalogue/types';

import type { IMaterialFormProps } from './Forms/types';

export type IMaterialTypeToFormMapping = Record<string, React.FC<IMaterialFormProps>>;

export interface IMaterialFormResolverProps extends IMaterialFormProps {
    materialType: MaterialType;
}
