export interface RequiredWire {
    materialId: string;
    requiredLength: number;
}

export interface RequiredBead {
    materialId: string;
    requiredQuantity: number;
}

export interface RequiredChain {
    materialId: string;
    requiredLength: number;
}

export interface RequiredEarHook {
    materialId: string;
    requiredQuantity: number;
}

export type RequiredMaterial = RequiredWire | RequiredBead | RequiredChain | RequiredEarHook;
