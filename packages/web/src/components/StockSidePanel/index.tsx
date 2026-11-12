import type { Material } from '@jewellery-catalogue/types';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { LISTINGS_PAGE, SHOPPING_LIST_PAGE } from '@/constants/routes';

interface StockSidePanelProps {
    notOnEtsyCount: number;
    unlinkedListingsCount: number | null;
    lowMaterials: Material[];
}

const Count = ({ children }: { children: ReactNode }) => (
    <span className="inline-flex min-w-7 items-center justify-center rounded-md bg-primary px-2 py-0.5 text-sm font-semibold text-primary-foreground">
        {children}
    </span>
);

const Panel = ({ title, count, children }: { title: string; count?: number; children: ReactNode }) => (
    <section className="space-y-2 rounded-md border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">{title}</h2>
            {count !== undefined && <Count>{count}</Count>}
        </div>
        {children}
    </section>
);

const panelLink = 'inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline md:min-h-0';

export const StockSidePanel = ({ notOnEtsyCount, unlinkedListingsCount, lowMaterials }: StockSidePanelProps) => (
    <div className="space-y-4">
        <Panel title="Not on Etsy yet" count={notOnEtsyCount}>
            <Link to="/designs?etsy=none" className={panelLink}>
                Review
            </Link>
        </Panel>
        {unlinkedListingsCount !== null && (
            <Panel title="Unlinked Etsy listings" count={unlinkedListingsCount}>
                <Link to={LISTINGS_PAGE.route} className={panelLink}>
                    Link
                </Link>
            </Panel>
        )}
        <Panel title="Running low" count={lowMaterials.length}>
            {lowMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No materials below their threshold.</p>
            ) : (
                <ul className="space-y-1 text-sm">
                    {lowMaterials.slice(0, 5).map((m) => (
                        <li key={m.id} className="truncate" title={m.name}>
                            {m.name}
                        </li>
                    ))}
                </ul>
            )}
            <Link to={SHOPPING_LIST_PAGE.route} className={panelLink}>
                Shopping list
            </Link>
        </Panel>
    </div>
);
