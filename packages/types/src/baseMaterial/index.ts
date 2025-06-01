import { MaterialType } from '../material';

export interface BaseMaterial {
    name: string;
    brand: string;
    diameter: number;
    purchaseUrl: string;
    type: MaterialType;
}
