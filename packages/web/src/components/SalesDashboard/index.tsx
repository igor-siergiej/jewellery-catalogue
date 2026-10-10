import type { SalesReportDesignRow } from '@jewellery-catalogue/types';
import { TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DesktopOnly, MobileCard, MobileCardList } from '@/components/MobileCardList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VIEW_DESIGN_PAGE } from '@/constants/routes';
import { useSalesReport } from '@/hooks/useSalesReport';

type RangeKey = '30d' | '90d' | 'year' | 'all';

const RANGES: Array<{ key: RangeKey; label: string }> = [
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'year', label: 'This year' },
    { key: 'all', label: 'All time' },
];

// Start of a day, so the query key (and cache) stays stable across re-renders within a day.
const rangeStart = (key: RangeKey): number | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (key === 'all') return null;
    if (key === 'year') return new Date(today.getFullYear(), 0, 1).getTime();
    const days = key === '30d' ? 30 : 90;
    return today.getTime() - days * 24 * 60 * 60 * 1000;
};

const money = (value: number) => `${value < 0 ? '-' : ''}£${Math.abs(value).toFixed(2)}`;
const percent = (value: number | null) => (value === null ? '–' : `${value.toFixed(1)}%`);

const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-md border bg-card p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
    </div>
);

const designFacts = (row: SalesReportDesignRow) => [
    { label: 'Sold', value: row.unitsSold },
    { label: 'Revenue', value: money(row.revenue) },
    { label: 'Materials', value: money(row.materialCost) },
    { label: 'Time', value: money(row.labourCost) },
    { label: 'Profit', value: money(row.profit) },
    { label: 'Margin', value: percent(row.marginPercent) },
];

export const SalesDashboard = ({ className }: { className?: string }) => {
    const [range, setRange] = useState<RangeKey>('30d');
    const from = useMemo(() => rangeStart(range), [range]);
    const { report } = useSalesReport(from);

    if (!report?.hasAnySales) return null;

    const { totals, unmatched, designs } = report;

    return (
        <Card data-testid="sales-dashboard" className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Sales
                </CardTitle>
                <CardDescription>
                    Etsy sales since order syncing began. Profit is revenue minus current material costs and making time
                    at your hourly rate.
                </CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                    {RANGES.map(({ key, label }) => (
                        <Button
                            key={key}
                            size="sm"
                            variant={range === key ? 'default' : 'outline'}
                            aria-pressed={range === key}
                            onClick={() => setRange(key)}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat label="Revenue" value={money(totals.revenue)} />
                    <Stat label="Units sold" value={String(totals.unitsSold)} />
                    <Stat label="Material cost" value={money(totals.materialCost)} />
                    <Stat label="Profit" value={`${money(totals.profit)} (${percent(totals.marginPercent)})`} />
                </div>

                {unmatched.unitsSold > 0 && (
                    <p className="text-sm text-muted-foreground">
                        Plus {unmatched.unitsSold} sale{unmatched.unitsSold === 1 ? '' : 's'} (
                        {money(unmatched.revenue)}) not linked to a design, so excluded from cost and profit.
                    </p>
                )}

                {designs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sales in this period.</p>
                ) : (
                    <>
                        <MobileCardList>
                            {designs.map((row) => (
                                <MobileCard
                                    key={row.designId}
                                    title={<Link to={VIEW_DESIGN_PAGE.getRoute(row.designId)}>{row.name}</Link>}
                                    facts={designFacts(row)}
                                />
                            ))}
                        </MobileCardList>
                        <DesktopOnly>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Design</TableHead>
                                        <TableHead className="text-right">Sold</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="text-right">Materials</TableHead>
                                        <TableHead className="text-right">Time</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
                                        <TableHead className="text-right">Margin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {designs.map((row) => (
                                        <TableRow key={row.designId}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    to={VIEW_DESIGN_PAGE.getRoute(row.designId)}
                                                    className="hover:underline"
                                                >
                                                    {row.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right">{row.unitsSold}</TableCell>
                                            <TableCell className="text-right">{money(row.revenue)}</TableCell>
                                            <TableCell className="text-right">{money(row.materialCost)}</TableCell>
                                            <TableCell className="text-right">{money(row.labourCost)}</TableCell>
                                            <TableCell className="text-right">{money(row.profit)}</TableCell>
                                            <TableCell className="text-right">{percent(row.marginPercent)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </DesktopOnly>
                    </>
                )}
            </CardContent>
        </Card>
    );
};
