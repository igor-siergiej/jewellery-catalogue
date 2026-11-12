import { useAuth } from '@imapps/web-utils';
import { DesignType, type Draft } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { FileEdit, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemFooter, ItemHeader, ItemTitle } from '@/components/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    FILTER_TAB_PROPS,
    Tabs,
    TabsList,
    TabsTrigger,
    UNDERLINE_TAB_CLASS,
    UNDERLINE_TAB_LIST_CLASS,
} from '@/components/ui/tabs';

import { getDraftsQuery, makeDeleteDraftRequest } from '../../api/endpoints/drafts';
import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { DesignCard } from '../../components/DesignCard';
import { StateView } from '../../components/StateView';
import { ADD_DESIGN_PAGE, SHOPPING_LIST_PAGE } from '../../constants/routes';
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

    return (
        <>
            <Item
                variant="outline"
                className="w-full flex-col items-start bg-card relative cursor-pointer hover:border-primary"
            >
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 text-destructive hover:bg-destructive hover:text-destructive-foreground md:size-8"
                        onClick={handleDeleteClick}
                        aria-label={`Delete draft ${draft.name}`}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                <ItemHeader className="basis-auto justify-center">
                    <div className="w-full aspect-square md:w-64 md:h-64 md:aspect-auto flex items-center justify-center rounded-md bg-muted border">
                        <FileEdit className="h-16 w-16 text-muted-foreground" />
                    </div>
                </ItemHeader>
                <ItemContent className="flex-none items-start text-left w-full">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                            Draft
                        </Badge>
                    </div>
                    <ItemTitle className="text-lg font-semibold w-full whitespace-normal break-words">
                        <Link
                            to={`${ADD_DESIGN_PAGE.route}?draftId=${draft.id}`}
                            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-inset focus-visible:after:ring-primary"
                        >
                            {draft.name}
                        </Link>
                    </ItemTitle>
                    <ItemFooter className="flex items-center gap-1 w-full">
                        <span className="text-xs text-muted-foreground">
                            {new Date(draft.updatedAt).toLocaleString()}
                        </span>
                    </ItemFooter>
                </ItemContent>
            </Item>

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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-3xl font-semibold">Designs</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline">
                        <Link to={SHOPPING_LIST_PAGE.route}>
                            <ShoppingCart /> Shopping list
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link to={ADD_DESIGN_PAGE.route}>
                            <Plus /> Add design
                        </Link>
                    </Button>
                </div>
            </div>

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
