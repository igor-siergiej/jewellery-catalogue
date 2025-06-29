import { MaterialType } from '../material';

export interface BaseMaterial {
    name: string;
    brand: string;
    purchaseUrl: string;
    type: MaterialType;
}
