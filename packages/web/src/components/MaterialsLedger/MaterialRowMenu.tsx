import type { Material } from '@jewellery-catalogue/types';
import { MoreHorizontal, Pencil, ShoppingBasket, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface MaterialRowActions {
    onEdit: (material: Material) => void;
    onDelete: (material: Material) => void;
}

const openPurchaseUrl = (url: string | null | undefined) => {
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

export function MaterialRowMenu({
    material,
    onEdit,
    onDelete,
}: MaterialRowActions & {
    material: Material;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 md:size-8"
                    aria-label={`More actions for ${material.name}`}
                >
                    <MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    disabled={!material.purchaseUrl}
                    onSelect={() => openPurchaseUrl(material.purchaseUrl)}
                >
                    <ShoppingBasket /> Buy
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(material)}>
                    <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => onDelete(material)}
                >
                    <Trash2 /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
