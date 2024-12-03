import { Material } from '../../types';

export type Time = `${number}:${number}`;

export interface IFormDesign {
    name: string;
    image: string;
    description: string;
    timeRequired: string;
    materials: Array<Material>;
}
