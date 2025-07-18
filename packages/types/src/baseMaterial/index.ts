import { MaterialType } from '../material';

export interface BaseMaterial {
    id: string;
    name: string;
    brand: string;
    purchaseUrl: string;
    type: MaterialType;
}
