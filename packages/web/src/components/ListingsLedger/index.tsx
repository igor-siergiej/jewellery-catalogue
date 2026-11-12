import type { Design } from '@jewellery-catalogue/types';
import { ExternalLink, MoreHorizontal, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { EtsyListingWithLinkStatus } from '@/api/endpoints/etsyListings';
import { DesignThumb } from '@/components/DesignThumb';
import { DesktopOnly, MobileCardList } from '@/components/MobileCardList';
import { StatusTag } from '@/components/StatusTag';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VIEW_DESIGN_PAGE } from '@/constants/routes';

interface ListingsLedgerProps {
    listings: EtsyListingWithLinkStatus[];
    designsById: Map<string, Design>;
    creating: boolean;
    onCreate: (listingId: number) => void;
    onLink: (listingId: number) => void;
}

const price = (value: number) => `£${value.toFixed(2)}`;

const Thumb = ({ listing, design }: { listing: EtsyListingWithLinkStatus; design?: Design }) =>
    listing.imageUrl ? (
        <img
            src={listing.imageUrl}
            alt=""
            loading="lazy"
            className="size-10 shrink-0 rounded-md bg-muted object-cover"
        />
    ) : design ? (
        <DesignThumb design={design} />
    ) : (
        <div className="size-10 shrink-0 rounded-md bg-muted" />
    );

const LinkedDesign = ({ listing, design }: { listing: EtsyListingWithLinkStatus; design?: Design }) =>
    listing.linkedDesignId ? (
        <Link
            to={VIEW_DESIGN_PAGE.getRoute(listing.linkedDesignId)}
            state={{ from: 'listing' }}
            title={design?.name}
            className="block truncate rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
            {design?.name ?? 'View design'}
        </Link>
    ) : (
        <StatusTag>Not linked</StatusTag>
    );

const ViewOnEtsy = ({ url }: { url: string }) => (
    <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-sm text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring md:min-h-8"
    >
        View on Etsy <ExternalLink className="size-3" aria-hidden="true" />
    </a>
);

const RowActions = ({
    listing,
    creating,
    onCreate,
    onLink,
}: Pick<ListingsLedgerProps, 'creating' | 'onCreate' | 'onLink'> & { listing: EtsyListingWithLinkStatus }) => {
    if (listing.linkedDesignId) return null;

    return (
        <div className="flex items-center justify-end gap-1">
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 md:min-h-8"
                onClick={() => onLink(listing.listingId)}
            >
                Link
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0 md:size-8"
                        aria-label={`More actions for ${listing.title}`}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={creating} onSelect={() => onCreate(listing.listingId)}>
                        <Plus /> Create design
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export const ListingsLedger = ({ listings, designsById, creating, onCreate, onLink }: ListingsLedgerProps) => (
    <>
        <MobileCardList>
            <ul className="divide-y rounded-md border bg-card" aria-label="Etsy listings">
                {listings.map((listing) => {
                    const design = listing.linkedDesignId ? designsById.get(listing.linkedDesignId) : undefined;

                    return (
                        <li key={listing.listingId} className="space-y-2 px-3 py-3">
                            <div className="flex items-center gap-3">
                                <Thumb listing={listing} design={design} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium" title={listing.title}>
                                        {listing.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {price(listing.price)}
                                        {listing.state === 'sold_out' && ' · Sold out'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <LinkedDesign listing={listing} design={design} />
                                </div>
                                <div className="flex items-center gap-1">
                                    <ViewOnEtsy url={listing.url} />
                                    <RowActions
                                        listing={listing}
                                        creating={creating}
                                        onCreate={onCreate}
                                        onLink={onLink}
                                    />
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </MobileCardList>
        <DesktopOnly className="rounded-md border bg-card">
            <Table className="min-w-[52rem] table-fixed">
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 px-3">
                            <span className="sr-only">Photo</span>
                        </TableHead>
                        <TableHead className="px-3">Title</TableHead>
                        <TableHead data-numeric className="w-24 px-3">
                            Price
                        </TableHead>
                        <TableHead className="w-52 px-3">Linked design</TableHead>
                        <TableHead className="w-36 px-3">
                            <span className="sr-only">Etsy</span>
                        </TableHead>
                        <TableHead className="w-36 px-3">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {listings.map((listing) => {
                        const design = listing.linkedDesignId ? designsById.get(listing.linkedDesignId) : undefined;

                        return (
                            <TableRow key={listing.listingId}>
                                <TableCell className="px-3">
                                    <Thumb listing={listing} design={design} />
                                </TableCell>
                                <TableCell className="px-3 font-medium">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="truncate" title={listing.title}>
                                            {listing.title}
                                        </span>
                                        {listing.state === 'sold_out' && <StatusTag>Sold out</StatusTag>}
                                    </div>
                                </TableCell>
                                <TableCell data-numeric className="px-3">
                                    {price(listing.price)}
                                </TableCell>
                                <TableCell className="px-3">
                                    <LinkedDesign listing={listing} design={design} />
                                </TableCell>
                                <TableCell className="px-3">
                                    <ViewOnEtsy url={listing.url} />
                                </TableCell>
                                <TableCell className="px-1">
                                    <RowActions
                                        listing={listing}
                                        creating={creating}
                                        onCreate={onCreate}
                                        onLink={onLink}
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </DesktopOnly>
    </>
);
