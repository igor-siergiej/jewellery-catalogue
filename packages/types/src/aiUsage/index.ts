export interface AiUsageRecord {
    userId: string;
    // e.g. 'etsy.listingCopy', 'design.priceSuggestion'
    feature: string;
    model: string;
    latencyMs: number;
    success: boolean;
    status: number;
    at: Date;
}
