import { useAuth } from '@imapps/web-utils';
import type { Design } from '@jewellery-catalogue/types';
import { Heart, MoreHorizontal, PackageOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import makeDeleteDesignRequest from '../../api/endpoints/deleteDesign';
import makeUpdateDesignRequest from '../../api/endpoints/updateDesign';
import { VIEW_DESIGN_PAGE } from '../../constants/routes';
import { describeDuration } from '../../lib/duration';
import { getEtsyStatus } from '../../lib/etsyStatus';
import { track } from '../../utils/analytics';
import DesignUpdateForm from '../DesignUpdateForm';
import { Image } from '../Image';
import { EtsyStatusTag, StatusTag } from '../StatusTag';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export interface DesignCardProps {
    design: Design;
    onDesignUpdated?: () => void;
    canMake?: string | null;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design, onDesignUpdated, canMake }) => {
    const { name, timeRequired, id, imageIds, totalQuantity, favourite, catalogueOnly } = design;
    const etsyImageUrl = design.etsy?.imageUrls?.[0];
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const navigate = useNavigate();
    const { accessToken, login, logout } = useAuth();

    const handleCardClick = () => {
        navigate(VIEW_DESIGN_PAGE.getRoute(id), { state: { from: 'designs' } });
    };

    const handleFavoriteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextFavourite = !favourite;
        await makeUpdateDesignRequest(id, { favourite: nextFavourite }, () => accessToken, login, logout);
        track(nextFavourite ? 'favourite_added' : 'favourite_removed', { designId: id });
        onDesignUpdated?.();
    };

    const handleDeleteConfirm = async () => {
        await makeDeleteDesignRequest(id, () => accessToken, login, logout);

        if (onDesignUpdated) {
            onDesignUpdated();
        }
    };

    const handleSuccess = () => {
        setEditDialogOpen(false);

        if (onDesignUpdated) {
            onDesignUpdated();
        }
    };

    const handleCancel = () => {
        setEditDialogOpen(false);
    };

    const nameId = `design-name-${id}`;
    const status = getEtsyStatus(design);
    const outOfStock = totalQuantity === 0;

    return (
        <>
            <article
                aria-labelledby={nameId}
                className="relative flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-card-foreground transition-colors hover:border-primary md:w-64"
                onClick={handleCardClick}
            >
                <div className="absolute right-2 top-2 z-10 flex gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-11 bg-card"
                        onClick={handleFavoriteClick}
                        aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
                        aria-pressed={!!favourite}
                    >
                        <Heart className={favourite ? 'fill-destructive text-destructive' : ''} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-11 bg-card"
                                aria-label={`More actions for ${name}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={() => setEditDialogOpen(true)}>
                                <PackageOpen /> Manage inventory
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="relative aspect-square w-full" data-testid="design-card-main-image">
                    {imageIds?.[0] ? (
                        <Image imageId={imageIds[0]} size="thumb" />
                    ) : etsyImageUrl ? (
                        <img src={etsyImageUrl} alt={name} className="h-full w-full object-contain" />
                    ) : (
                        <Image imageId="" />
                    )}
                    {etsyImageUrl && (
                        <div
                            className="absolute bottom-2 left-2 h-10 w-10 overflow-hidden rounded-md border-2 border-background bg-muted"
                            title="Linked Etsy listing image"
                        >
                            <img src={etsyImageUrl} alt="Linked Etsy listing" className="h-full w-full object-cover" />
                        </div>
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-1 p-3">
                    <h3 id={nameId} className="truncate text-base font-semibold" title={name}>
                        {name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        <span className={outOfStock ? 'font-medium text-destructive' : undefined}>
                            {design.variants && design.variants.length > 0
                                ? `${design.variants.length} variants · ${totalQuantity} in stock`
                                : `${totalQuantity} in stock`}
                        </span>{' '}
                        · {describeDuration(timeRequired)}
                    </p>
                    {canMake && (
                        <p className="text-sm text-muted-foreground" data-testid="can-make">
                            {canMake}
                        </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <EtsyStatusTag status={status} />
                        {catalogueOnly && <StatusTag>Catalogue only</StatusTag>}
                    </div>
                </div>
            </article>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Design Inventory</DialogTitle>
                    </DialogHeader>
                    <DesignUpdateForm design={design} onSuccess={handleSuccess} onCancel={handleCancel} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The design will be permanently removed from your catalogue.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDeleteConfirm}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
