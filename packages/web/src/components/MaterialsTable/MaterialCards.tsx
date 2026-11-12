import type { Material } from '@jewellery-catalogue/types';

import { MaterialRowMenu, type MaterialRowActions } from '@/components/MaterialsLedger/MaterialRowMenu';
import { MobileCardList, MobileSortSelect } from '@/components/MobileCardList';
import { cellText, type MaterialColumnKey } from '@/lib/materialColumns';

const DETAIL_COLUMNS: ReadonlySet<MaterialColumnKey> = new Set([
    'code',
    'colour',
    'diameter',
    'wireType',
    'metalType',
    'length',
]);

interface MaterialCardsProps extends MaterialRowActions {
    materials: Array<Material>;
    columns: MaterialColumnKey[];
    sortOptions: Array<{ field: string; label: string }>;
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string) => void;
}

/** Phone layout of the materials ledger: one row per material, actions in the row menu. */
export const MaterialCards = ({
    materials,
    columns,
    sortOptions,
    sortField,
    sortDirection,
    onSort,
    onEdit,
    onDelete,
}: MaterialCardsProps) => {
    const showType = columns.includes('type');
    const details = columns.filter((key) => DETAIL_COLUMNS.has(key));

    return (
        <>
            <MobileSortSelect
                options={sortOptions}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
            />
            <MobileCardList>
                <ul className="divide-y rounded-md border bg-card" aria-label="Materials">
                    {materials.map((material) => {
                        const subtitle = [
                            ...(showType ? [cellText(material, 'type')] : []),
                            cellText(material, 'brand'),
                            ...details.map((key) => cellText(material, key)).filter((text) => text !== '–'),
                        ].join(' · ');

                        return (
                            <li key={material.id} className="flex min-h-11 items-center gap-1 py-1 pl-3 pr-1">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium" title={material.name}>
                                        {material.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground" title={subtitle}>
                                        {subtitle}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {cellText(material, 'stock')} in stock
                                        {' · '}
                                        {cellText(material, 'pricePerPack')} per pack
                                        {' · '}
                                        {cellText(material, 'unitPrice')}
                                    </p>
                                </div>
                                <MaterialRowMenu material={material} onEdit={onEdit} onDelete={onDelete} />
                            </li>
                        );
                    })}
                </ul>
            </MobileCardList>
        </>
    );
};
