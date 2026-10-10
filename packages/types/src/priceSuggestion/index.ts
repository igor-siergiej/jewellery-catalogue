export interface PriceSuggestion {
    low: number;
    high: number;
    recommended: number;
    rationale: string;
    // The deterministic SuggestedPrice formula result, for comparison.
    formulaPrice: number;
    // The range is never allowed below this.
    materialCost: number;
}
