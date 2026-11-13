import { Link } from 'react-router-dom';

import { DesignThumb } from '@/components/DesignThumb';
import { DesktopOnly, MobileCardList } from '@/components/MobileCardList';
import { EtsyStatusTag } from '@/components/StatusTag';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VIEW_DESIGN_PAGE } from '@/constants/routes';
import type { StockRow, StockSeverity } from '@/lib/stockLedger';
import { cn } from '@/lib/utils';

const SEVERITY_TEXT: Record<StockSeverity, string> = {
    out: 'text-destructive font-semibold',
    low: 'text-warning font-semibold',
    ok: '',
};

const canMakeText = (canMake: number | null) => (canMake === null ? '–' : String(canMake));

const ProblemVariants = ({ row }: { row: StockRow }) => {
    if (row.problemVariants.length === 0) return null;

    return (
        <p className={cn('truncate text-xs', SEVERITY_TEXT[row.severity] || 'text-warning')}>
            {row.problemVariants.map((v) => `${v.name} · ${v.inStock} left`).join(', ')}
        </p>
    );
};

const DesignName = ({ row }: { row: StockRow }) => (
    <div className="flex min-w-0 items-center gap-3">
        <DesignThumb design={row.design} />
        <div className="min-w-0">
            <Link
                to={VIEW_DESIGN_PAGE.getRoute(row.design.id)}
                state={{ from: 'home' }}
                title={row.design.name}
                className="block truncate font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
                {row.design.name}
            </Link>
            <ProblemVariants row={row} />
        </div>
    </div>
);

export const StockLedger = ({ rows }: { rows: StockRow[] }) => (
    <>
        <MobileCardList>
            <ul className="divide-y rounded-md border bg-card" aria-label="Stock">
                {rows.map((row) => (
                    <li key={row.design.id}>
                        <Link
                            to={VIEW_DESIGN_PAGE.getRoute(row.design.id)}
                            state={{ from: 'home' }}
                            className="flex min-h-11 items-center gap-3 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <DesignThumb design={row.design} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium" title={row.design.name}>
                                    {row.design.name}
                                </p>
                                <ProblemVariants row={row} />
                                <p className="text-xs text-muted-foreground">
                                    <span className={SEVERITY_TEXT[row.severity]}>{row.inStock} in stock</span>
                                    {' · '}Can make {canMakeText(row.canMake)}
                                </p>
                            </div>
                            <EtsyStatusTag status={row.etsy} />
                        </Link>
                    </li>
                ))}
            </ul>
        </MobileCardList>
        <DesktopOnly>
            <div className="rounded-md border bg-card">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-3">Design</TableHead>
                            <TableHead data-numeric className="w-28 px-3">
                                In stock
                            </TableHead>
                            <TableHead data-numeric className="w-28 px-3">
                                Can make
                            </TableHead>
                            <TableHead className="w-36 px-3">Etsy</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.design.id} className="relative">
                                <TableCell data-name title={row.design.name} className="px-3">
                                    <DesignName row={row} />
                                </TableCell>
                                <TableCell data-numeric className={cn('px-3', SEVERITY_TEXT[row.severity])}>
                                    {row.inStock}
                                </TableCell>
                                <TableCell data-numeric className="px-3">
                                    {canMakeText(row.canMake)}
                                </TableCell>
                                <TableCell className="px-3">
                                    <EtsyStatusTag status={row.etsy} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DesktopOnly>
    </>
);
