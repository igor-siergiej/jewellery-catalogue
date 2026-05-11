import type { Wire } from '@jewellery-catalogue/types';
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';

import MaterialUpdateForm from '@/components/MaterialUpdateForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { METAL_TYPE_LABELS, WIRE_TYPE_LABELS } from '@/lib/materialLabels';

export interface IWireTableProps {
    materials: Array<Wire>;
    onMaterialUpdated?: () => void;
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string) => void;
}

const WireTable: React.FC<IWireTableProps> = ({ materials, onMaterialUpdated, sortField, sortDirection, onSort }) => {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Wire | null>(null);

    const handleEdit = (material: Wire) => {
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
                            {sortableHead('wireType', 'Wire Type')}
                            {sortableHead('metalType', 'Metal Type')}
                            {sortableHead('diameter', 'Diameter (mm)')}
                            {sortableHead('totalLength', 'Total Length (m)')}
                            {sortableHead('lengthPerPack', 'Length/Pack (m)')}
                            {sortableHead('pricePerPack', 'Price/Pack')}
                            {sortableHead('pricePerMeter', 'Price/m')}
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                                    No wire materials found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            materials.map((material) => (
                                <TableRow key={material.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{material.name}</TableCell>
                                    <TableCell>{material.materialCode || '-'}</TableCell>
                                    <TableCell>{material.brand}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{WIRE_TYPE_LABELS[material.wireType]}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{METAL_TYPE_LABELS[material.metalType]}</Badge>
                                    </TableCell>
                                    <TableCell>{material.diameter.toFixed(2)}mm</TableCell>
                                    <TableCell>{material.totalLength.toFixed(2)}m</TableCell>
                                    <TableCell>{material.lengthPerPack.toFixed(2)}m</TableCell>
                                    <TableCell>£{material.pricePerPack.toFixed(2)}</TableCell>
                                    <TableCell>£{material.pricePerMeter.toFixed(2)}</TableCell>
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
                            ))
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

export default WireTable;
