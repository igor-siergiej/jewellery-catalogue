import { DesignType, MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';

// User-friendly labels for Material Types
export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
    [MaterialType.WIRE]: 'Wire',
    [MaterialType.BEAD]: 'Bead',
    [MaterialType.CHAIN]: 'Chain',
    [MaterialType.EAR_HOOK]: 'Ear Hook',
};

// User-friendly labels for Wire Types
export const WIRE_TYPE_LABELS: Record<WIRE_TYPE, string> = {
    [WIRE_TYPE.FULL]: 'Solid',
    [WIRE_TYPE.FILLED]: 'Filled',
    [WIRE_TYPE.PLATED]: 'Plated',
};

export const DESIGN_TYPE_LABELS: Record<DesignType, string> = {
    [DesignType.EARRINGS]: 'Earrings',
    [DesignType.EARCUFF]: 'Ear Cuff',
    [DesignType.RING]: 'Ring',
    [DesignType.NECKLACE]: 'Necklace',
    [DesignType.BRACELET]: 'Bracelet',
};

// User-friendly labels for Metal Types
export const METAL_TYPE_LABELS: Record<METAL_TYPE, string> = {
    [METAL_TYPE.BRASS]: 'Brass',
    [METAL_TYPE.COPPER]: 'Copper',
    [METAL_TYPE.SILVER]: 'Silver',
    [METAL_TYPE.GOLD]: 'Gold',
    [METAL_TYPE.GILT]: 'Gilt',
};
