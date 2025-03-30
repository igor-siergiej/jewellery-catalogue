import { Material } from '@jewellery-catalogue/types';

export type Time = `${number}:${number}`;

export interface IFormDesign {
    name: string;
    image: string;
    description: string;
    timeRequired: string;
    materials: Array<Material>;
}
