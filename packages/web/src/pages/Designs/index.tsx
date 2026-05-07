import { useAuth } from '@imapps/web-utils';
import type { Draft } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { FileEdit, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemContent, ItemFooter, ItemHeader, ItemTitle } from '@/components/ui/item';

import { getDraftsQuery, makeDeleteDraftRequest } from '../../api/endpoints/drafts';
import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { DesignCard } from '../../components/DesignCard';
import LoadingScreen from '../../components/Loading';
import { ADD_DESIGN_PAGE } from '../../constants/routes';
import { useSearch } from '../../context/SearchContext';

const DraftCard: React.FC<{ draft: Draft; onDeleted: () => void }> = ({ draft, onDeleted }) => {
    const { accessToken, login, logout } = useAuth();
    const navigate = useNavigate();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleCardClick = () => {
        navigate(`${ADD_DESIGN_PAGE.route}?draftId=${draft.id}`);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
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
                className="w-fit max-w-max flex-col items-start bg-card relative cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                onClick={handleCardClick}
            >
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={handleDeleteClick}
                        title="Delete Draft"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                <ItemHeader className="basis-auto justify-center">
                    <div className="w-64 h-64 flex items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                        <FileEdit className="h-16 w-16 text-primary/40" />
                    </div>
                </ItemHeader>
                <ItemContent className="flex-none items-start text-left w-full">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                            Draft
                        </Badge>
                    </div>
                    <ItemTitle className="text-lg font-semibold">{draft.name}</ItemTitle>
                    <ItemFooter className="flex items-center gap-1 w-full">
                        <span className="text-xs text-muted-foreground">
                            {new Date(draft.updatedAt).toLocaleString()}
                        </span>
                    </ItemFooter>
                </ItemContent>
            </Item>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete draft "{draft.name}"? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const Designs = () => {
    const { accessToken, login, logout } = useAuth();
    const { searchQuery } = useSearch();
    const queryClient = useQueryClient();

    const { data, isError, refetch } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

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

    if (isError) {
        return <span>Something went wrong! :(</span>;
    }

    if (!data) {
        return <LoadingScreen />;
    }

    const filteredData = searchQuery && fuse ? fuse.search(searchQuery).map((result) => result.item) : data;
    const filteredDrafts = searchQuery
        ? (drafts ?? []).filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : (drafts ?? []);

    const designs = filteredData.map((design) => {
        return <DesignCard key={design.id} design={design} onDesignUpdated={() => refetch()} />;
    });

    const draftCards = filteredDrafts.map((draft) => (
        <DraftCard key={draft.id} draft={draft} onDeleted={handleDraftDeleted} />
    ));

    const isEmpty = filteredData.length === 0 && filteredDrafts.length === 0;

    return (
        <div>
            {isEmpty ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Sparkles />
                        </EmptyMedia>
                        <EmptyTitle>{data.length === 0 ? 'No Designs Yet' : 'No Matching Designs'}</EmptyTitle>
                        <EmptyDescription>
                            {data.length === 0
                                ? 'Start creating beautiful jewellery designs to see them here!'
                                : 'Try adjusting your search query'}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="flex flex-wrap justify-center gap-6">
                    {draftCards}
                    {designs}
                </div>
            )}
        </div>
    );
};

export default Designs;
