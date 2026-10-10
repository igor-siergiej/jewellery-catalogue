import type { Design, Sale, SalesReportDesignRow, SalesReportTotals } from '@jewellery-catalogue/types';

const round2 = (value: number): number => Math.round(value * 100) / 100;

// timeRequired is stored as "HH:MM"; anything unparseable counts as no time.
export const hoursFromTimeRequired = (timeRequired: string): number => {
    const [hours, minutes] = timeRequired.split(':').map((part) => Number.parseInt(part, 10));
    const total = (hours || 0) + (minutes || 0) / 60;
    return Number.isFinite(total) ? total : 0;
};

const marginPercent = (profit: number, revenue: number): number | null =>
    revenue > 0 ? round2((profit / revenue) * 100) : null;

// Costs use each design's current material costs and time, not the values at the time of sale.
export const calculateSalesReport = (args: {
    sales: Sale[];
    designs: Design[];
    hourlyRate: number;
}): {
    totals: SalesReportTotals;
    unmatched: { unitsSold: number; revenue: number };
    designs: SalesReportDesignRow[];
} => {
    const designsById = new Map(args.designs.map((d) => [d.id, d]));
    const rows = new Map<string, SalesReportDesignRow>();
    const unmatched = { unitsSold: 0, revenue: 0 };

    for (const sale of args.sales) {
        const revenue = sale.price * sale.quantity;
        const design = sale.designId ? designsById.get(sale.designId) : undefined;

        if (!design) {
            unmatched.unitsSold += sale.quantity;
            unmatched.revenue += revenue;
            continue;
        }

        const variant = sale.variantId ? design.variants?.find((v) => v.id === sale.variantId) : undefined;
        const unitMaterialCost = variant?.totalMaterialCosts ?? design.totalMaterialCosts;
        const unitLabourCost = hoursFromTimeRequired(design.timeRequired) * args.hourlyRate;

        const row = rows.get(design.id) ?? {
            designId: design.id,
            name: design.name,
            unitsSold: 0,
            revenue: 0,
            materialCost: 0,
            labourCost: 0,
            profit: 0,
            marginPercent: null,
        };
        row.unitsSold += sale.quantity;
        row.revenue += revenue;
        row.materialCost += unitMaterialCost * sale.quantity;
        row.labourCost += unitLabourCost * sale.quantity;
        rows.set(design.id, row);
    }

    const designRows = [...rows.values()]
        .map((row) => {
            const profit = row.revenue - row.materialCost - row.labourCost;
            return {
                ...row,
                revenue: round2(row.revenue),
                materialCost: round2(row.materialCost),
                labourCost: round2(row.labourCost),
                profit: round2(profit),
                marginPercent: marginPercent(profit, row.revenue),
            };
        })
        .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);

    const sum = (key: 'unitsSold' | 'revenue' | 'materialCost' | 'labourCost' | 'profit') =>
        round2(designRows.reduce((total, row) => total + row[key], 0));
    const revenue = sum('revenue');
    const profit = sum('profit');

    return {
        totals: {
            unitsSold: sum('unitsSold'),
            revenue,
            materialCost: sum('materialCost'),
            labourCost: sum('labourCost'),
            profit,
            marginPercent: marginPercent(profit, revenue),
        },
        unmatched: { unitsSold: unmatched.unitsSold, revenue: round2(unmatched.revenue) },
        designs: designRows,
    };
};
