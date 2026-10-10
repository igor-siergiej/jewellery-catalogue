import type { DesignType } from '../design/enum';

export interface SuggestedMaterial {
    materialId: string;
    // Wire and chain in centimetres, everything else in pieces (the units the design form uses).
    quantity: number;
    // 0 to 1, as reported by the model
    confidence: number;
}

export interface DesignSuggestion {
    name: string;
    designType: DesignType | null;
    // Only materials the user owns; the API drops any id that isn't in their inventory.
    materials: SuggestedMaterial[];
    // Things visible in the photo that don't match anything in stock.
    notInStock: Array<{ description: string }>;
}
