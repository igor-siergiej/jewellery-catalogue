import { useAuth } from '@imapps/web-utils';
import type { EtsyListingCopy, EtsyListingRefreshProposal } from '@jewellery-catalogue/types';
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { makeApplyListingCopyRequest, makeProposeListingCopyRequest } from '@/api/endpoints/etsyListingRefresh';
import type { EtsyListingWithLinkStatus } from '@/api/endpoints/etsyListings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { runWithConcurrency } from '@/utils/runWithConcurrency';

const CONCURRENCY = 2;

type ItemState =
    | { status: 'queued' | 'generating' | 'skipped' | 'applying' | 'applied' }
    | { status: 'ready'; proposal: EtsyListingRefreshProposal }
    | { status: 'failed'; message: string; proposal?: EtsyListingRefreshProposal };

const STATUS_LABEL: Record<ItemState['status'], string> = {
    queued: 'Waiting',
    generating: 'Generating…',
    ready: 'Ready to review',
    failed: 'Failed',
    skipped: 'Skipped',
    applying: 'Updating Etsy…',
    applied: 'Updated on Etsy',
};

const CopyColumn = ({ heading, copy }: { heading: string; copy: EtsyListingCopy }) => (
    <div className="min-w-0 space-y-2">
        <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">{heading}</p>
        <p className="font-medium break-words">{copy.title}</p>
        <div className="flex flex-wrap gap-1">
            {copy.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-normal">
                    {tag}
                </Badge>
            ))}
        </div>
        <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">{copy.description}</p>
    </div>
);

export const ListingCopyRefresh = ({ listings }: { listings: EtsyListingWithLinkStatus[] }) => {
    const { accessToken, login, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [items, setItems] = useState<Map<number, ItemState>>(new Map());
    const [running, setRunning] = useState(false);

    if (listings.length === 0) return null;

    const setItem = (listingId: number, state: ItemState) =>
        setItems((current) => new Map(current).set(listingId, state));
    const titleOf = (listingId: number) => listings.find((l) => l.listingId === listingId)?.title ?? listingId;

    const toggle = (listingId: number) =>
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(listingId)) next.delete(listingId);
            else next.add(listingId);
            return next;
        });

    const generate = async () => {
        const ids = [...selected];
        setItems(new Map(ids.map((id) => [id, { status: 'queued' } as ItemState])));
        setRunning(true);
        // A failed listing is marked on its own row; the rest of the batch carries on.
        await runWithConcurrency(ids, CONCURRENCY, async (listingId) => {
            setItem(listingId, { status: 'generating' });
            try {
                const proposal = await makeProposeListingCopyRequest(listingId, () => accessToken, login, logout);
                setItem(listingId, { status: 'ready', proposal });
            } catch {
                setItem(listingId, { status: 'failed', message: "Couldn't generate new copy." });
            }
        });
        setRunning(false);
    };

    const accept = async (proposal: EtsyListingRefreshProposal) => {
        setItem(proposal.listingId, { status: 'applying' });
        try {
            await makeApplyListingCopyRequest(proposal.listingId, proposal.proposed, () => accessToken, login, logout);
            setItem(proposal.listingId, { status: 'applied' });
        } catch {
            setItem(proposal.listingId, { status: 'failed', message: "Etsy didn't accept the update.", proposal });
        }
    };

    if (!open) {
        return (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                <Sparkles className="h-4 w-4" /> Refresh listing copy with AI
            </Button>
        );
    }

    return (
        <Card data-testid="listing-copy-refresh">
            <CardHeader>
                <CardTitle>Refresh listing copy</CardTitle>
                <CardDescription>
                    Pick linked listings to get a new title, description and tags. Nothing changes on Etsy until you
                    accept a listing.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {listings.map((listing) => (
                        <div key={listing.listingId} className="flex items-center gap-2 text-sm">
                            <Checkbox
                                id={`refresh-listing-${listing.listingId}`}
                                checked={selected.has(listing.listingId)}
                                onCheckedChange={() => toggle(listing.listingId)}
                                disabled={running}
                                aria-label={`Select ${listing.title}`}
                            />
                            <label htmlFor={`refresh-listing-${listing.listingId}`} className="truncate">
                                {listing.title}
                            </label>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={generate} disabled={selected.size === 0 || running}>
                        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Generate new copy ({selected.size})
                    </Button>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={running}>
                        Close
                    </Button>
                </div>

                {[...items.entries()].map(([listingId, state]) => {
                    const proposal = 'proposal' in state ? state.proposal : undefined;
                    return (
                        <div
                            key={listingId}
                            className="rounded-md border p-3 space-y-3"
                            data-testid="listing-refresh-item"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">{titleOf(listingId)}</p>
                                <Badge variant={state.status === 'failed' ? 'destructive' : 'secondary'}>
                                    {STATUS_LABEL[state.status]}
                                </Badge>
                            </div>
                            {state.status === 'failed' && <p className="text-sm text-destructive">{state.message}</p>}
                            {proposal && (state.status === 'ready' || state.status === 'failed') && (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <CopyColumn heading="Current" copy={proposal.current} />
                                        <CopyColumn heading="Proposed" copy={proposal.proposed} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" onClick={() => accept(proposal)}>
                                            Accept and update Etsy
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setItem(listingId, { status: 'skipped' })}
                                        >
                                            Skip
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};
