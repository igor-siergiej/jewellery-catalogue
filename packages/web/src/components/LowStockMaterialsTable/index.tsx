import type { Material } from '@jewellery-catalogue/types';
import { AlertCircle, Edit, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';

import MaterialUpdateForm from '@/components/MaterialUpdateForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMaterialCurrentPacks } from '@/utils/lowStock';

export interface ILowStockMaterialsTableProps {
    materials: Array<Material>;
    onMaterialUpdated?: () => void;
}

const LowStockMaterialsTable: React.FC<ILowStockMaterialsTableProps> = ({ materials, onMaterialUpdated }) => {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

    const formatPrice = (value: number | null | undefined) => {
        if (value == null) return '';
        return `£${Number(value).toFixed(2)}`;
    };

    const getSeverityBadge = (material: Material) => {
        const currentPacks = getMaterialCurrentPacks(material);
        const threshold = material.lowStockThreshold ?? 0;

        if (currentPacks === 0) {
            return <Badge variant="destructive">Out of Stock</Badge>;
        } else if (currentPacks === 1) {
            return <Badge className="bg-red-600">Critical</Badge>;
        } else if (currentPacks < threshold) {
            return <Badge variant="secondary">Low</Badge>;
        }
        return <Badge variant="outline">Normal</Badge>;
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

    return (
        <>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold">Material Code</TableHead>
                            <TableHead className="font-semibold">Brand</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Total Stock</TableHead>
                            <TableHead className="font-semibold">Per Pack</TableHead>
                            <TableHead className="font-semibold">Stock Status</TableHead>
                            <TableHead className="font-semibold">Severity</TableHead>
                            <TableHead className="font-semibold">Price/Pack</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                    No low-stock materials.
                                </TableCell>
                            </TableRow>
                        ) : (
                            materials.map((material, index) => {
                                const getTotalStock = () => {
                                    if ('totalLength' in material) return `${((material as any).totalLength as number).toFixed(2)}m`;
                                    if ('totalQuantity' in material) return Math.round((material as any).totalQuantity);
                                    return '-';
                                };

                                const getPerPack = () => {
                                    if ('lengthPerPack' in material) return `${((material as any).lengthPerPack as number).toFixed(2)}m`;
                                    if ('quantityPerPack' in material) return Math.round((material as any).quantityPerPack);
                                    return '-';
                                };

                                const currentPacks = getMaterialCurrentPacks(material);
                                const threshold = material.lowStockThreshold ?? '-';

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
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-500" />
                                            {currentPacks} / {threshold} packs
                                        </TableCell>
                                        <TableCell>{getSeverityBadge(material)}</TableCell>
                                        <TableCell>{formatPrice((material as any).pricePerPack)}</TableCell>
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
        </>
    );
};

export default LowStockMaterialsTable;
