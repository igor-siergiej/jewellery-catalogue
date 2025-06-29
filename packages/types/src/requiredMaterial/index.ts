export interface RequiredWire {
    id: string;
    requiredLength: number;
}

export interface RequiredBead {
    id: string;
    requiredQuantity: number;
}

export interface RequiredChain {
    id: string;
    requiredLength: number;
}

export interface RequiredEarHook {
    id: string;
    requiredQuantity: number;
}

export type RequiredMaterial = RequiredWire | RequiredBead | RequiredChain | RequiredEarHook;
