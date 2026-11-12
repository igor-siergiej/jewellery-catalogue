import type { Sale } from '@jewellery-catalogue/types';
import { Link } from 'react-router-dom';

import { VIEW_DESIGN_PAGE } from '../../constants/routes';

interface UnmatchedEtsySalesProps {
    sales: Sale[];
}

export const UnmatchedEtsySales = ({ sales }: UnmatchedEtsySalesProps) => {
    if (sales.length === 0) return null;

    return (
        <section
            data-testid="unmatched-etsy-sales"
            className="rounded-lg border bg-card"
            aria-labelledby="unmatched-sales"
        >
            <div className="border-b px-4 py-3">
                <h2 id="unmatched-sales" className="text-base font-semibold">
                    Unmatched Etsy sales
                </h2>
                <p className="text-sm text-muted-foreground">
                    These sales couldn't be matched to a design or variant, so stock was left unchanged. Adjust stock by
                    hand, and link the listing to a design so future sales are tracked.
                </p>
            </div>
            <ul className="divide-y px-4">
                {sales.map((sale) => (
                    <li
                        key={sale.transactionId}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                        <div className="min-w-0">
                            <p className="truncate font-medium" title={sale.title}>
                                {sale.title}
                            </p>
                            <p className="text-muted-foreground">
                                {sale.quantity} × £{sale.price.toFixed(2)} ·{' '}
                                {new Date(sale.soldAt).toLocaleDateString()}
                                {sale.variationLabel ? ` · ${sale.variationLabel}` : ''}
                            </p>
                        </div>
                        {sale.designId ? (
                            <Link
                                to={VIEW_DESIGN_PAGE.getRoute(sale.designId)}
                                state={{ from: 'listing' }}
                                className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline md:min-h-0"
                            >
                                Variant not recognised: view design
                            </Link>
                        ) : (
                            <span className="text-muted-foreground">No linked design</span>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
};
