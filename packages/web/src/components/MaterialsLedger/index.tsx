import { useAuth } from '@imapps/web-utils';
import type { Material } from '@jewellery-catalogue/types';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

import makeDeleteMaterialRequest from '@/api/endpoints/deleteMaterial';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { MaterialCards } from '@/components/MaterialsTable/MaterialCards';
import MaterialUpdateForm from '@/components/MaterialUpdateForm';
import { DesktopOnly } from '@/components/MobileCardList';
import { StateView } from '@/components/StateView';
import { StatusTag } from '@/components/StatusTag';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    cellText,
    COLUMN_LABELS,
    columnsFor,
    type MaterialColumnKey,
    type MaterialTab,
    NUMERIC_COLUMNS,
} from '@/lib/materialColumns';
import { cn } from '@/lib/utils';

import { MaterialRowMenu } from './MaterialRowMenu';

export type MaterialSortDirection = 'asc' | 'desc';

interface MaterialsLedgerProps {
    materials: Array<Material>;
    tab: MaterialTab;
    sortKey: MaterialColumnKey | null;
    sortDirection: MaterialSortDirection;
    onSort: (key: MaterialColumnKey) => void;
    onMaterialUpdated?: () => void;
}

const COLUMN_WIDTH: Partial<Record<MaterialColumnKey, string>> = {
    code: 'w-24',
    brand: 'w-36',
    type: 'w-28',
    stock: 'w-28',
    perPack: 'w-28',
    pricePerPack: 'w-40',
    unitPrice: 'w-28',
    diameter: 'w-24',
    colour: 'w-28',
    wireType: 'w-24',
    metalType: 'w-24',
    length: 'w-32',
};

const SORT_ARIA = { asc: 'ascending', desc: 'descending' } as const;

function SortHead({
    columnKey,
    sortKey,
    sortDirection,
    onSort,
}: {
    columnKey: MaterialColumnKey;
    sortKey: MaterialColumnKey | null;
    sortDirection: MaterialSortDirection;
    onSort: (key: MaterialColumnKey) => void;
}) {
    const active = sortKey === columnKey;
    const Icon = !active ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown;
    const numeric = NUMERIC_COLUMNS.has(columnKey);

    return (
        <TableHead
            data-numeric={numeric ? '' : undefined}
            aria-sort={active ? SORT_ARIA[sortDirection] : undefined}
            className={cn('px-3', COLUMN_WIDTH[columnKey])}
        >
            <button
                type="button"
                onClick={() => onSort(columnKey)}
                className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {COLUMN_LABELS[columnKey]}
                <Icon className={cn('size-3 shrink-0', !active && 'opacity-40')} aria-hidden="true" />
            </button>
        </TableHead>
    );
}

export function MaterialsLedger({
    materials,
    tab,
    sortKey,
    sortDirection,
    onSort,
    onMaterialUpdated,
}: MaterialsLedgerProps) {
    const { accessToken, login, logout } = useAuth();
    const [editing, setEditing] = useState<Material | null>(null);
    const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const columns = columnsFor(tab);

    const closeEditor = () => setEditing(null);

    const handleSaved = () => {
        closeEditor();
        onMaterialUpdated?.();
    };

    const handleDeleteConfirm = async () => {
        if (!materialToDelete) return;

        setIsDeleting(true);

        try {
            await makeDeleteMaterialRequest(materialToDelete.id, () => accessToken, login, logout);
            setMaterialToDelete(null);
            onMaterialUpdated?.();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            {materials.length === 0 ? (
                <StateView kind="empty" title="No materials found" body="Try a different search or another type." />
            ) : (
                <>
                    <MaterialCards
                        materials={materials}
                        columns={columns}
                        sortOptions={columns.map((key) => ({ field: key, label: COLUMN_LABELS[key] }))}
                        sortField={sortKey}
                        sortDirection={sortDirection}
                        onSort={(field) => onSort(field as MaterialColumnKey)}
                        onEdit={setEditing}
                        onDelete={setMaterialToDelete}
                    />
                    <DesktopOnly className="rounded-md border bg-card">
                        <Table className="min-w-[48rem] table-fixed">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    {columns.map((key) => (
                                        <SortHead
                                            key={key}
                                            columnKey={key}
                                            sortKey={sortKey}
                                            sortDirection={sortDirection}
                                            onSort={onSort}
                                        />
                                    ))}
                                    <TableHead className="w-14 px-3">
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {materials.map((material) => (
                                    <TableRow key={material.id}>
                                        {columns.map((key) => {
                                            const text = cellText(material, key);

                                            if (key === 'name') {
                                                return (
                                                    <TableCell
                                                        key={key}
                                                        data-name
                                                        title={text}
                                                        className="px-3 font-medium"
                                                    >
                                                        {text}
                                                    </TableCell>
                                                );
                                            }

                                            return (
                                                <TableCell
                                                    key={key}
                                                    data-numeric={NUMERIC_COLUMNS.has(key) ? '' : undefined}
                                                    data-name={key === 'brand' ? '' : undefined}
                                                    title={key === 'brand' ? text : undefined}
                                                    className="px-3"
                                                >
                                                    {key === 'type' ? <StatusTag>{text}</StatusTag> : text}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="px-1 text-right">
                                            <MaterialRowMenu
                                                material={material}
                                                onEdit={setEditing}
                                                onDelete={setMaterialToDelete}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </DesktopOnly>
                </>
            )}

            {editing && (
                <MaterialUpdateForm
                    key={editing.id}
                    material={editing}
                    onSuccess={handleSaved}
                    onCancel={closeEditor}
                />
            )}

            <DeleteConfirmDialog
                name={materialToDelete?.name ?? null}
                description="The material is permanently removed from your catalogue. This can't be undone."
                onConfirm={handleDeleteConfirm}
                onCancel={() => setMaterialToDelete(null)}
                isDeleting={isDeleting}
            />
        </>
    );
}
