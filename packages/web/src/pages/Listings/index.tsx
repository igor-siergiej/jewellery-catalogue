import { ExternalLink, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

import LoadingScreen from '../../components/Loading';
import { Badge } from '../../components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { SETTINGS_PAGE, VIEW_DESIGN_PAGE } from '../../constants/routes';
import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import { useEtsyListings } from '../../hooks/useEtsyListings';

const Listings = () => {
    const { connected: etsyConnected, isLoading: isConnectionLoading } = useEtsyConnection();
    const { listings, isLoading, isError } = useEtsyListings(etsyConnected);

    if (isConnectionLoading) {
        return <LoadingScreen />;
    }

    if (!etsyConnected) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <ShoppingBag />
                    </EmptyMedia>
                    <EmptyTitle>Etsy Not Connected</EmptyTitle>
                    <EmptyDescription>
                        <Link to={SETTINGS_PAGE.route} className="text-primary hover:underline">
                            Connect your Etsy shop
                        </Link>{' '}
                        to see your active listings here.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isError) {
        return <span>Something went wrong! :(</span>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Etsy Listings</h1>
                <p className="text-sm text-muted-foreground">
                    {listings.length} active listing{listings.length === 1 ? '' : 's'} on Etsy. Only active listings are
                    shown here — drafts sitting on Etsy outside this app aren't included.
                </p>
            </div>

            {listings.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShoppingBag />
                        </EmptyMedia>
                        <EmptyTitle>No Active Listings</EmptyTitle>
                        <EmptyDescription>Your shop has no active Etsy listings right now.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Linked Design</TableHead>
                            <TableHead>Etsy</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {listings.map((listing) => (
                            <TableRow key={listing.listingId}>
                                <TableCell className="font-medium">{listing.title}</TableCell>
                                <TableCell>£{listing.price.toFixed(2)}</TableCell>
                                <TableCell>
                                    {listing.linkedDesignId ? (
                                        <Link
                                            to={VIEW_DESIGN_PAGE.getRoute(listing.linkedDesignId)}
                                            className="text-primary hover:underline"
                                        >
                                            View design
                                        </Link>
                                    ) : (
                                        <Badge variant="secondary">Not linked</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <a
                                        href={listing.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                    >
                                        View <ExternalLink className="h-3 w-3" />
                                    </a>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
};

export default Listings;
