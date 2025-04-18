import { Material } from "../material";
import { PersistentFile } from "../util";

export interface FormDesign {
    materials: Array<Material>;
    name: string;
    description: string;
    timeRequired: string;
    image: File;
    totalMaterialCosts: number;
    price: number;
}

export interface UploadDesign {
    materials: string;
    name: string;
    description: string;
    timeRequired: string;
    image: PersistentFile;
    totalMaterialCosts: number;
    price: number;
}

export interface Design {
    id: string;
    materials: Array<Material>;
    name: string;
    imageId: string;
    timeRequired: string;
    description: string;
    totalMaterialCosts: number;
    price: number;
}

