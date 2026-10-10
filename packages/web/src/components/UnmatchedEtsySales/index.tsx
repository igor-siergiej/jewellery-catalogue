import type { Sale } from '@jewellery-catalogue/types';
import { Link } from 'react-router-dom';

import { VIEW_DESIGN_PAGE } from '../../constants/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface UnmatchedEtsySalesProps {
    sales: Sale[];
}

export const UnmatchedEtsySales = ({ sales }: UnmatchedEtsySalesProps) => {
    if (sales.length === 0) return null;

    return (
        <Card data-testid="unmatched-etsy-sales">
            <CardHeader>
                <CardTitle>Unmatched Etsy sales</CardTitle>
                <CardDescription>
                    These sales couldn't be matched to a design or variant, so stock was left unchanged. Adjust stock by
                    hand, and link the listing to a design so future sales are tracked.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="divide-y">
                    {sales.map((sale) => (
                        <li
                            key={sale.transactionId}
                            className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                        >
                            <div className="min-w-0">
                                <p className="truncate font-medium">{sale.title}</p>
                                <p className="text-muted-foreground">
                                    {sale.quantity} × £{sale.price.toFixed(2)} ·{' '}
                                    {new Date(sale.soldAt).toLocaleDateString()}
                                    {sale.variationLabel ? ` · ${sale.variationLabel}` : ''}
                                </p>
                            </div>
                            {sale.designId ? (
                                <Link
                                    to={VIEW_DESIGN_PAGE.getRoute(sale.designId)}
                                    className="text-primary hover:underline"
                                >
                                    Variant not recognised: view design
                                </Link>
                            ) : (
                                <span className="text-muted-foreground">No linked design</span>
                            )}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};
