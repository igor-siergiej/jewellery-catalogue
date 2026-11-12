import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { LinkDesignDialog } from '../../components/LinkDesignDialog';
import { ListingCopyRefresh } from '../../components/ListingCopyRefresh';
import { ListingsLedger } from '../../components/ListingsLedger';
import { StateView } from '../../components/StateView';
import { Button } from '../../components/ui/button';
import { UnmatchedEtsySales } from '../../components/UnmatchedEtsySales';
import { SETTINGS_PAGE, VIEW_DESIGN_PAGE } from '../../constants/routes';
import { useSearch } from '../../context/SearchContext';
import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import { useEtsyListings } from '../../hooks/useEtsyListings';
import { useEtsyReconcile } from '../../hooks/useEtsyReconcile';
import { useSearchAnalytics } from '../../hooks/useSearchAnalytics';
import { useUnmatchedEtsySales } from '../../hooks/useUnmatchedEtsySales';

const Listings = () => {
    const { accessToken, login, logout } = useAuth();
    const { connected: etsyConnected, isLoading: isConnectionLoading } = useEtsyConnection();
    const { listings, isLoading, isError, refetch } = useEtsyListings(etsyConnected);
    const { sales: unmatchedSales } = useUnmatchedEtsySales(etsyConnected);
    const navigate = useNavigate();
    const { createFromListing, isCreating } = useEtsyReconcile();
    const [linkDialogListingId, setLinkDialogListingId] = useState<number | null>(null);
    const { searchQuery } = useSearch();

    const { data: designs } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: etsyConnected && !!accessToken,
    });

    const designsById = useMemo(() => new Map((designs ?? []).map((d) => [d.id, d])), [designs]);

    const fuse = useMemo(() => {
        return new Fuse(listings, {
            keys: ['title'],
            threshold: 0.4,
            includeScore: true,
        });
    }, [listings]);

    const filteredListings = searchQuery ? fuse.search(searchQuery).map((result) => result.item) : listings;

    useSearchAnalytics('listings', filteredListings.length);

    const handleCreate = async (listingId: number) => {
        const { designId } = await createFromListing(listingId);
        navigate(VIEW_DESIGN_PAGE.getRoute(designId), { state: { from: 'listing' } });
    };

    if (isConnectionLoading) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="loading" what="Etsy" />
            </div>
        );
    }

    if (!etsyConnected) {
        return (
            <div className="p-4 md:p-6">
                <StateView
                    kind="empty"
                    title="Etsy is not connected"
                    body="Connect your shop to see its listings here."
                    action={
                        <Button asChild className="min-h-11 md:min-h-9">
                            <Link to={SETTINGS_PAGE.route}>Connect your Etsy shop</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="loading" what="your Etsy listings" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="error" what="your Etsy listings" onRetry={() => refetch()} />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div>
                <h1 className="font-display text-3xl font-semibold">Etsy</h1>
                <p className="text-sm text-muted-foreground">
                    {listings.length} listing{listings.length === 1 ? '' : 's'} on Etsy (active and sold out). Drafts
                    sitting on Etsy outside this app aren't included.
                </p>
            </div>

            <UnmatchedEtsySales sales={unmatchedSales} />

            <ListingCopyRefresh listings={listings.filter((l) => l.linkedDesignId !== null)} />

            {listings.length === 0 ? (
                <StateView
                    kind="empty"
                    title="No listings"
                    body="Your shop has no active or sold-out Etsy listings right now."
                />
            ) : filteredListings.length === 0 ? (
                <StateView kind="empty" title="No matching listings" body="Try a different search." />
            ) : (
                <ListingsLedger
                    listings={filteredListings}
                    designsById={designsById}
                    creating={isCreating}
                    onCreate={handleCreate}
                    onLink={setLinkDialogListingId}
                />
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
