import { useAuth } from '@imapps/web-utils';
import type { Design } from '@jewellery-catalogue/types';
import { Clock, Heart, PackageOpen, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import makeDeleteDesignRequest from '../../api/endpoints/deleteDesign';
import { VIEW_DESIGN_PAGE } from '../../constants/routes';
import DesignUpdateForm from '../DesignUpdateForm';
import { Image } from '../Image';
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
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Item, ItemContent, ItemFooter, ItemHeader, ItemTitle } from '../ui/item';

export interface DesignCardProps {
    design: Design;
    onDesignUpdated?: () => void;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design, onDesignUpdated }) => {
    const { name, timeRequired, id, imageIds, totalQuantity } = design;
    const etsyImageUrl = design.etsy?.imageUrls?.[0];
    const [isFavorite, setIsFavorite] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const navigate = useNavigate();
    const { accessToken, login, logout } = useAuth();

    const handleCardClick = () => {
        navigate(VIEW_DESIGN_PAGE.getRoute(id));
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFavorite(!isFavorite);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditDialogOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteDialogOpen(true);
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

    return (
        <>
            <Item
                key={id}
                variant="outline"
                className="w-64 flex-col items-start bg-card relative cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                onClick={handleCardClick}
            >
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-black"
                        onClick={handleEditClick}
                        title="Manage Inventory"
                    >
                        <PackageOpen className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-black" onClick={handleFavoriteClick}>
                        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={handleDeleteClick}
                        title="Delete Design"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                <ItemHeader className="basis-auto justify-start">
                    <div className="w-56 h-56 relative">
                        <Image imageId={imageIds?.[0] ?? ''} />
                        {etsyImageUrl && (
                            <div
                                className="absolute bottom-2 left-2 h-10 w-10 rounded-md border-2 border-background bg-muted overflow-hidden shadow"
                                title="Linked Etsy listing image"
                            >
                                <img
                                    src={etsyImageUrl}
                                    alt="Linked Etsy listing"
                                    className="h-full w-full object-cover"
                                />
                                <ShoppingBag className="absolute -top-1 -right-1 h-3.5 w-3.5 text-primary bg-background rounded-full p-0.5" />
                            </div>
                        )}
                    </div>
                </ItemHeader>
                <ItemContent className="flex-none items-start text-left w-full">
                    <ItemTitle className="text-lg font-semibold w-full whitespace-normal break-words">{name}</ItemTitle>
                    <ItemFooter className="flex items-center gap-1.5 w-full flex-wrap">
                        <Badge
                            variant="secondary"
                            className="gap-1 font-normal text-white leading-none [&_svg]:text-white [&_svg]:shrink-0"
                        >
                            <Clock className="h-3.5 w-3.5" />
                            {timeRequired} hours
                        </Badge>

                        <Badge
                            variant="secondary"
                            className={
                                totalQuantity === 0
                                    ? 'gap-1 font-normal border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                    : 'gap-1 font-normal text-white leading-none [&_svg]:text-white [&_svg]:shrink-0'
                            }
                        >
                            <PackageOpen className="h-3.5 w-3.5" />
                            {design.variants && design.variants.length > 0
                                ? `${design.variants.length} variants · ${totalQuantity} in stock`
                                : `${totalQuantity} in stock`}
                        </Badge>
                    </ItemFooter>
                </ItemContent>
            </Item>

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
