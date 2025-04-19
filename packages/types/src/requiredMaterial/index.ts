export interface RequiredWire {
    id: string;
    requiredLength: number;
}

export interface RequiredBead {
    id: string;
    requiredQuantity: number;
}

export type RequiredMaterial = RequiredWire | RequiredBead;
