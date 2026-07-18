import type { DesignType } from '../design/enum';
import type { PersistentFile } from '../util';

export interface UploadDesign {
    materials: string;
    name: string;
    description: string;
    timeRequired: string;
    image: PersistentFile;
    totalMaterialCosts: number;
    price: number;
    lowStockThreshold?: number;
    variationGroups?: string;
    variants?: string;
    designType?: DesignType;
    makingNotes?: string;
}
