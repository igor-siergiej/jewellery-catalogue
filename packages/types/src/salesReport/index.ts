export interface SalesReportDesignRow {
    designId: string;
    name: string;
    unitsSold: number;
    revenue: number;
    materialCost: number;
    labourCost: number;
    // revenue minus material and labour cost
    profit: number;
    // profit as a percentage of revenue; null when revenue is 0
    marginPercent: number | null;
}

export interface SalesReportTotals {
    unitsSold: number;
    revenue: number;
    materialCost: number;
    labourCost: number;
    profit: number;
    marginPercent: number | null;
}

export interface SalesReport {
    // false until the first Etsy sale is recorded, so the UI can hide the dashboard entirely
    hasAnySales: boolean;
    from: number | null; // epoch ms, inclusive
    to: number | null; // epoch ms, exclusive
    totals: SalesReportTotals;
    // Sales with no linked design: their revenue is known but their cost is not, so they are kept out of totals.
    unmatched: { unitsSold: number; revenue: number };
    // sorted by revenue, highest first
    designs: SalesReportDesignRow[];
}
