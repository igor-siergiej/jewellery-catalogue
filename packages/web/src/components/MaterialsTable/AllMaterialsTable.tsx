import { useAuth } from '@imapps/web-utils';
import type { Material } from '@jewellery-catalogue/types';
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, ShoppingBasket, Trash2 } from 'lucide-react';
import { useState } from 'react';

import makeDeleteMaterialRequest from '@/api/endpoints/deleteMaterial';
import MaterialUpdateForm from '@/components/MaterialUpdateForm';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface IAllMaterialsTableProps {
    materials: Array<Material>;
    onMaterialUpdated?: () => void;
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string) => void;
}

const AllMaterialsTable: React.FC<IAllMaterialsTableProps> = ({
    materials,
    onMaterialUpdated,
    sortField,
    sortDirection,
    onSort,
}) => {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { accessToken, login, logout } = useAuth();

    const formatPrice = (value: number | null | undefined) => {
        if (value == null) return '';
        return `£${Number(value).toFixed(2)}`;
    };

    const handleEdit = (material: Material) => {
        setSelectedMaterial(material);
        setEditDialogOpen(true);
    };

    const handleSuccess = () => {
        setEditDialogOpen(false);
        setSelectedMaterial(null);
        if (onMaterialUpdated) {
            onMaterialUpdated();
        }
    };

    const handleCancel = () => {
        setEditDialogOpen(false);
        setSelectedMaterial(null);
    };

    const handleOpenPurchaseUrl = (url: string | null | undefined) => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!materialToDelete) return;
        setIsDeleting(true);
        try {
            await makeDeleteMaterialRequest(materialToDelete.id, () => accessToken, login, logout);
            setMaterialToDelete(null);
            if (onMaterialUpdated) {
                onMaterialUpdated();
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const sortIcon = (field: string) => {
        if (!onSort) return null;
        if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline-block shrink-0" />;
        return sortDirection === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3 inline-block shrink-0" />
        ) : (
            <ArrowDown className="ml-1 h-3 w-3 inline-block shrink-0" />
        );
    };

    const sortableHead = (field: string, label: string, className?: string) => (
        <TableHead
            className={`font-semibold${onSort ? ' cursor-pointer select-none' : ''}${className ? ` ${className}` : ''}`}
            onClick={() => onSort?.(field)}
        >
            <span className="flex items-center gap-1">
                {label}
                {sortIcon(field)}
            </span>
        </TableHead>
    );

    return (
        <>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            {sortableHead('name', 'Name')}
                            {sortableHead('materialCode', 'Material Code')}
                            {sortableHead('brand', 'Brand')}
                            {sortableHead('type', 'Type')}
                            <TableHead className="font-semibold">Total Stock</TableHead>
                            <TableHead className="font-semibold">Per Pack</TableHead>
                            {sortableHead('pricePerPack', 'Price/Pack')}
                            <TableHead className="font-semibold">Per Unit Price</TableHead>
                            {sortableHead('diameter', 'Diameter')}
                            <TableHead className="font-semibold">Colour</TableHead>
                            <TableHead className="font-semibold">Wire Type</TableHead>
                            <TableHead className="font-semibold">Metal Type</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                                    No materials found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            materials.map((material, index) => {
                                const getTotalStock = () => {
                                    if ('totalLength' in material)
                                        return `${((material as any).totalLength as number).toFixed(2)}m`;
                                    if ('totalQuantity' in material) return Math.round((material as any).totalQuantity);
                                    return '-';
                                };

                                const getPerPack = () => {
                                    if ('lengthPerPack' in material)
                                        return `${((material as any).lengthPerPack as number).toFixed(2)}m`;
                                    if ('quantityPerPack' in material)
                                        return Math.round((material as any).quantityPerPack);
                                    return '-';
                                };

                                const getPerUnitPrice = () => {
                                    if ('pricePerMeter' in material)
                                        return formatPrice((material as any).pricePerMeter);
                                    if ('pricePerBead' in material) return formatPrice((material as any).pricePerBead);
                                    if ('pricePerPiece' in material)
                                        return formatPrice((material as any).pricePerPiece);
                                    return '-';
                                };

                                return (
                                    <TableRow key={material.id || `material-${index}`} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">{material.name}</TableCell>
                                        <TableCell>{material.materialCode || '-'}</TableCell>
                                        <TableCell>{material.brand}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize">
                                                {material.type.toLowerCase().replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getTotalStock()}</TableCell>
                                        <TableCell>{getPerPack()}</TableCell>
                                        <TableCell>{formatPrice((material as any).pricePerPack)}</TableCell>
                                        <TableCell>{getPerUnitPrice()}</TableCell>
                                        <TableCell>
                                            {(material as any).diameter
                                                ? `${((material as any).diameter as number).toFixed(2)}mm`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>{(material as any).colour || '-'}</TableCell>
                                        <TableCell>{(material as any).wireType || '-'}</TableCell>
                                        <TableCell>{(material as any).metalType || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenPurchaseUrl(material.purchaseUrl)}
                                                    disabled={!material.purchaseUrl}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ShoppingBasket className="h-4 w-4" />
                                                    <span className="sr-only">Buy material</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(material)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    <span className="sr-only">Edit material</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setMaterialToDelete(material)}
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete material</span>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    {selectedMaterial && (
                        <MaterialUpdateForm
                            material={selectedMaterial}
                            onSuccess={handleSuccess}
                            onCancel={handleCancel}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!materialToDelete} onOpenChange={(open) => !open && setMaterialToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Material</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete "{materialToDelete?.name}"? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
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

export default AllMaterialsTable;
