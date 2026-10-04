import type { Material } from '@jewellery-catalogue/types';
import { Edit, ShoppingBasket } from 'lucide-react';
import type React from 'react';

import { MobileCard, type MobileCardFact, MobileCardList, MobileSortSelect } from '@/components/MobileCardList';
import { Button } from '@/components/ui/button';

interface MaterialCardsProps<T extends Material> {
    materials: Array<T>;
    badges: (material: T) => React.ReactNode;
    facts: (material: T) => Array<MobileCardFact>;
    onEdit: (material: T) => void;
    extraActions?: (material: T) => React.ReactNode;
    sortOptions?: Array<{ field: string; label: string }>;
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string) => void;
    emptyText: string;
}

export const MaterialCards = <T extends Material>({
    materials,
    badges,
    facts,
    onEdit,
    extraActions,
    sortOptions,
    sortField,
    sortDirection,
    onSort,
    emptyText,
}: MaterialCardsProps<T>) => (
    <>
        {sortOptions && (
            <MobileSortSelect
                options={sortOptions}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
            />
        )}
        <MobileCardList>
            {materials.length === 0 ? (
                <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : (
                materials.map((material, index) => (
                    <MobileCard
                        key={material.id || `material-${index}`}
                        title={material.name}
                        badges={badges(material)}
                        facts={facts(material)}
                        actions={
                            <>
                                <Button
                                    variant="outline"
                                    className="h-10 flex-1"
                                    disabled={!material.purchaseUrl}
                                    onClick={() =>
                                        window.open(material.purchaseUrl ?? '', '_blank', 'noopener,noreferrer')
                                    }
                                >
                                    <ShoppingBasket className="h-4 w-4" />
                                    Buy
                                </Button>
                                <Button variant="outline" className="h-10 flex-1" onClick={() => onEdit(material)}>
                                    <Edit className="h-4 w-4" />
                                    Edit
                                </Button>
                                {extraActions?.(material)}
                            </>
                        }
                    />
                ))
            )}
        </MobileCardList>
    </>
);
