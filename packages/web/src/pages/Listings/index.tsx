import Fuse from 'fuse.js';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LinkDesignDialog } from '../../components/LinkDesignDialog';
import LoadingScreen from '../../components/Loading';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { SETTINGS_PAGE, VIEW_DESIGN_PAGE } from '../../constants/routes';
import { useSearch } from '../../context/SearchContext';
import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import { useEtsyListings } from '../../hooks/useEtsyListings';
import { useEtsyReconcile } from '../../hooks/useEtsyReconcile';

const Listings = () => {
    const { connected: etsyConnected, isLoading: isConnectionLoading } = useEtsyConnection();
    const { listings, isLoading, isError } = useEtsyListings(etsyConnected);
    const navigate = useNavigate();
    const { createFromListing, isCreating } = useEtsyReconcile();
    const [linkDialogListingId, setLinkDialogListingId] = useState<number | null>(null);
    const { searchQuery } = useSearch();

    const fuse = useMemo(() => {
        return new Fuse(listings, {
            keys: ['title'],
            threshold: 0.4,
            includeScore: true,
        });
    }, [listings]);

    const filteredListings = searchQuery ? fuse.search(searchQuery).map((result) => result.item) : listings;

    const handleCreate = async (listingId: number) => {
        const { designId } = await createFromListing(listingId);
        navigate(VIEW_DESIGN_PAGE.getRoute(designId));
    };

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
                    {listings.length} listing{listings.length === 1 ? '' : 's'} on Etsy (active and sold out). Drafts
                    sitting on Etsy outside this app aren't included.
                </p>
            </div>

            {listings.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShoppingBag />
                        </EmptyMedia>
                        <EmptyTitle>No Listings</EmptyTitle>
                        <EmptyDescription>
                            Your shop has no active or sold-out Etsy listings right now.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : filteredListings.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShoppingBag />
                        </EmptyMedia>
                        <EmptyTitle>No Matching Listings</EmptyTitle>
                        <EmptyDescription>Try adjusting your search query.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead />
                            <TableHead>Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Linked Design</TableHead>
                            <TableHead>Etsy</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredListings.map((listing) => (
                            <TableRow key={listing.listingId}>
                                <TableCell>
                                    {listing.imageUrl ? (
                                        <img
                                            src={listing.imageUrl}
                                            alt={listing.title}
                                            className="h-10 w-10 rounded object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded bg-muted" />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {listing.title}
                                        {listing.state === 'sold_out' && <Badge variant="secondary">Sold out</Badge>}
                                    </div>
                                </TableCell>
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
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                disabled={isCreating}
                                                onClick={() => handleCreate(listing.listingId)}
                                            >
                                                Create design
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => setLinkDialogListingId(listing.listingId)}
                                            >
                                                Link existing
                                            </Button>
                                        </div>
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

            {linkDialogListingId !== null && (
                <LinkDesignDialog
                    listingId={linkDialogListingId}
                    open={linkDialogListingId !== null}
                    onOpenChange={(o) => !o && setLinkDialogListingId(null)}
                    onLinked={() => setLinkDialogListingId(null)}
                />
            )}
        </div>
    );
};

export default Listings;
