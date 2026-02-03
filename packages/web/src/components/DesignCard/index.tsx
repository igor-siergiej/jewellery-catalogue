import type { Design } from '@jewellery-catalogue/types';
import { Clock, Heart, PackageOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { VIEW_DESIGN_PAGE } from '../../constants/routes';
import DesignUpdateForm from '../DesignUpdateForm';
import { Image } from '../Image';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Item, ItemContent, ItemFooter, ItemHeader, ItemTitle } from '../ui/item';

export interface DesignCardProps {
    design: Design;
    onDesignUpdated?: () => void;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design, onDesignUpdated }) => {
    const { name, timeRequired, id, imageId, totalQuantity } = design;
    const [isFavorite, setIsFavorite] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const navigate = useNavigate();

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
                className="w-fit max-w-max flex-col items-start bg-card relative cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
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
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-black"
                        onClick={handleFavoriteClick}
                    >
                        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                </div>
                <ItemHeader className="basis-auto justify-start">
                    <div className="w-64 h-64">
                        <Image imageId={imageId} />
                    </div>
                </ItemHeader>
                <ItemContent className="flex-none items-start text-left w-full">
                    <ItemTitle className="text-lg font-semibold">{name}</ItemTitle>
                    <ItemFooter className="flex items-center gap-1 w-full">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {timeRequired} hours
                            </div>

                            <div className="flex items-center gap-1">
                                <PackageOpen className="h-4 w-4" />
                                {totalQuantity} in stock
                            </div>
                        </div>
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
        </>
    );
};
