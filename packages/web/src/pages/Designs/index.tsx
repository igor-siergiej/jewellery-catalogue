import { useAuth } from '@imapps/web-utils';
import { DesignType, type Draft } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { Image } from '@/components/Image';
import { StatusTag } from '@/components/StatusTag';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    FILTER_TAB_PROPS,
    Tabs,
    TabsList,
    TabsTrigger,
    UNDERLINE_TAB_CLASS,
    UNDERLINE_TAB_LIST_CLASS,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { getDraftsQuery, makeDeleteDraftRequest } from '../../api/endpoints/drafts';
import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { DesignCard } from '../../components/DesignCard';
import { CARD_ACTIONS_CLASS, CARD_ICON_BUTTON_CLASS, CARD_ICON_CLASS } from '../../components/DesignCard/cardActions';
import { ListPageHeader } from '../../components/ListPageHeader';
import { StateView } from '../../components/StateView';
import { ADD_DESIGN_PAGE } from '../../constants/routes';
import { useSearch } from '../../context/SearchContext';
import { PRODUCIBLE_QUERY_KEY, useProducible } from '../../hooks/useProducible';
import { useSearchAnalytics } from '../../hooks/useSearchAnalytics';
import { applyDesignFilters, parseDesignFilters, toSearchParams } from '../../lib/designFilters';
import { ETSY_STATUS_LABEL, type EtsyStatus } from '../../lib/etsyStatus';
import { DESIGN_TYPE_LABELS } from '../../lib/materialLabels';
import { sortFavouritesFirst } from '../../lib/sortFavouritesFirst';
import { canMakeLabel } from '../../utils/canMakeLabel';

const DraftCard: React.FC<{ draft: Draft; onDeleted: () => void }> = ({ draft, onDeleted }) => {
    const { accessToken, login, logout } = useAuth();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleDeleteClick = () => {
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        await makeDeleteDraftRequest(draft.id, () => accessToken, login, logout);
        setConfirmOpen(false);
        onDeleted();
    };

    const nameId = `draft-name-${draft.id}`;

    return (
        <>
            <article
                aria-labelledby={nameId}
                className="relative flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-card-foreground transition-colors hover:border-primary"
            >
                <div className={CARD_ACTIONS_CLASS}>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={cn(
                            CARD_ICON_BUTTON_CLASS,
                            'text-destructive hover:bg-destructive hover:text-destructive-foreground'
                        )}
                        onClick={handleDeleteClick}
                        aria-label={`Delete draft ${draft.name}`}
                    >
                        <Trash2 className={CARD_ICON_CLASS} />
                    </Button>
                </div>
                <div className="relative aspect-square w-full">
                    <Image imageId={draft.imageId ?? ''} size="thumb" />
                </div>
                <div className="flex min-w-0 flex-col gap-1 p-3">
                    <h2 id={nameId} className="truncate text-base font-semibold" title={draft.name}>
                        <Link
                            to={`${ADD_DESIGN_PAGE.route}?draftId=${draft.id}`}
                            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-inset focus-visible:after:ring-primary"
                        >
                            {draft.name}
                        </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Edited {new Date(draft.updatedAt).toLocaleDateString()}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusTag>Draft</StatusTag>
                    </div>
                </div>
            </article>

            <DeleteConfirmDialog
                name={confirmOpen ? draft.name : null}
                description="The draft is permanently removed. This can't be undone."
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
            />
        </>
    );
};

const Designs = () => {
    const { accessToken, login, logout } = useAuth();
    const { searchQuery, setSearchQuery } = useSearch();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = parseDesignFilters(searchParams);
    const typeFilter = filters.type;

    const { data, isError, refetch } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const producible = useProducible();

    const { data: drafts } = useQuery({
        ...getDraftsQuery('design', () => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const fuse = useMemo(() => {
        if (!data) return null;

        return new Fuse(data, {
            keys: ['name'],
            threshold: 0.4,
            includeScore: true,
        });
    }, [data]);

    const handleDraftDeleted = () => {
        queryClient.invalidateQueries({ queryKey: ['drafts', 'design'] });
    };

    const searchedData = searchQuery && fuse ? fuse.search(searchQuery).map((result) => result.item) : (data ?? []);

    useSearchAnalytics('designs', searchedData.length);

    if (isError) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="error" what="designs" onRetry={() => refetch()} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="loading" what="designs" />
            </div>
        );
    }

    const setFilters = (next: Partial<typeof filters>) =>
        setSearchParams(toSearchParams({ ...filters, ...next }), { replace: true });

    const filteredData = sortFavouritesFirst(applyDesignFilters(searchedData, filters));

    const searchedDrafts = searchQuery
        ? (drafts ?? []).filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : (drafts ?? []);

    const filteredDrafts = typeFilter === 'all' && filters.etsy === 'all' ? searchedDrafts : [];

    const designs = filteredData.map((design) => {
        return (
            <DesignCard
                key={design.id}
                design={design}
                canMake={canMakeLabel(producible.get(design.id))}
                onDesignUpdated={() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: PRODUCIBLE_QUERY_KEY });
                }}
            />
        );
    });

    const draftCards = filteredDrafts.map((draft) => (
        <DraftCard key={draft.id} draft={draft} onDeleted={handleDraftDeleted} />
    ));

    const isEmpty = filteredData.length === 0 && filteredDrafts.length === 0;

    const hasFilters = filters.type !== 'all' || filters.etsy !== 'all' || !!searchQuery;

    return (
        <div className="space-y-4 p-4 md:p-6">
            <ListPageHeader title="Designs" addLabel="Add design" addRoute={ADD_DESIGN_PAGE.route} />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    className="min-w-0 max-w-full"
                    value={typeFilter}
                    onValueChange={(v) => setFilters({ type: v as DesignType | 'all' })}
                >
                    <TabsList className={UNDERLINE_TAB_LIST_CLASS}>
                        <TabsTrigger value="all" className={UNDERLINE_TAB_CLASS} {...FILTER_TAB_PROPS}>
                            All <span className="ml-1 text-muted-foreground">{data.length}</span>
                        </TabsTrigger>
                        {(Object.keys(DesignType) as Array<DesignType>).map((type) => (
                            <TabsTrigger key={type} value={type} className={UNDERLINE_TAB_CLASS} {...FILTER_TAB_PROPS}>
                                {DESIGN_TYPE_LABELS[type]}{' '}
                                <span className="ml-1 text-muted-foreground">
                                    {data.filter((d) => d.designType === type).length}
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                <Select value={filters.etsy} onValueChange={(v) => setFilters({ etsy: v as EtsyStatus | 'all' })}>
                    <SelectTrigger aria-label="Etsy status" className="min-h-11 w-48 md:min-h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Etsy statuses</SelectItem>
                        {(Object.keys(ETSY_STATUS_LABEL) as EtsyStatus[]).map((status) => (
                            <SelectItem key={status} value={status}>
                                {ETSY_STATUS_LABEL[status]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isEmpty ? (
                <StateView
                    kind="empty"
                    title={data.length === 0 ? 'No designs yet' : 'No matching designs'}
                    body={
                        data.length === 0
                            ? 'Add your first design to start tracking stock.'
                            : 'Try a different search or filter.'
                    }
                    action={
                        hasFilters && data.length > 0 ? (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchParams({}, { replace: true });
                                    setSearchQuery('');
                                }}
                            >
                                Clear filters
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {draftCards}
                    {designs}
                </div>
            )}
        </div>
    );
};

export default Designs;
