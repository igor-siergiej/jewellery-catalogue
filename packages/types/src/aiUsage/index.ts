export interface AiUsageRecord {
    userId: string;
    // e.g. 'etsy.listingCopy', 'design.suggestFromPhoto'
    feature: string;
    model: string;
    latencyMs: number;
    success: boolean;
    status: number;
    at: Date;
}
