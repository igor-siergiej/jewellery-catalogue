export const SALES_REPORT = {
    hasAnySales: true,
    from: null,
    to: null,
    totals: { unitsSold: 7, revenue: 182.5, materialCost: 31, labourCost: 52.5, profit: 99, marginPercent: 54.25 },
    unmatched: { unitsSold: 1, revenue: 15 },
    designs: [
        {
            designId: 'design-moon',
            name: 'Silver Moon Pendant Necklace',
            unitsSold: 4,
            revenue: 120,
            materialCost: 20,
            labourCost: 30,
            profit: 70,
            marginPercent: 58.33,
        },
        {
            designId: 'design-hoop',
            name: 'Gold Hoop Earrings',
            unitsSold: 3,
            revenue: 62.5,
            materialCost: 11,
            labourCost: 22.5,
            profit: 29,
            marginPercent: 46.4,
        },
    ],
};
