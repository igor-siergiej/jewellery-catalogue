import { Design } from '@jewellery-catalogue/types';
import { Clock, Heart } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { VIEW_DESIGN_PAGE } from '../../constants/routes';
import { Image } from '../Image';
import { Button } from '../ui/button';
import { Item, ItemContent, ItemFooter, ItemHeader, ItemTitle } from '../ui/item';

export interface DesignCardProps {
    design: Design;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design }) => {
    const { name, timeRequired, id, imageId } = design;
    const [isFavorite, setIsFavorite] = useState(false);
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(VIEW_DESIGN_PAGE.getRoute(id));
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFavorite(!isFavorite);
    };

    return (
        <Item
            key={id}
            variant="outline"
            className="w-fit max-w-max flex-col items-start bg-card relative cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
            onClick={handleCardClick}
        >
            <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-2 right-2 z-10"
                onClick={handleFavoriteClick}
            >
                <Heart
                    className={`h-10 w-10 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                />
            </Button>
            <ItemHeader className="basis-auto justify-start">
                <div className="w-64 h-64">
                    <Image
                        imageId={imageId}
                    />
                </div>
            </ItemHeader>
            <ItemContent className="flex-none items-start text-left w-full">
                <ItemTitle className="text-lg font-semibold">{name}</ItemTitle>
                <ItemFooter className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {timeRequired}
                    {' '}
                    hours
                </ItemFooter>
            </ItemContent>
        </Item>
    );
};
