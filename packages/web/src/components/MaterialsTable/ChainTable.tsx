import type { Chain } from '@jewellery-catalogue/types';
import { Edit, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';

import MaterialUpdateForm from '@/components/MaterialUpdateForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { METAL_TYPE_LABELS, WIRE_TYPE_LABELS } from '@/lib/materialLabels';

export interface IChainTableProps {
    materials: Array<Chain>;
    onMaterialUpdated?: () => void;
}

const ChainTable: React.FC<IChainTableProps> = ({ materials, onMaterialUpdated }) => {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Chain | null>(null);

    const handleEdit = (material: Chain) => {
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
                            <TableHead className="font-semibold">Wire Type</TableHead>
                            <TableHead className="font-semibold">Metal Type</TableHead>
                            <TableHead className="font-semibold">Diameter (mm)</TableHead>
                            <TableHead className="font-semibold">Total Length (m)</TableHead>
                            <TableHead className="font-semibold">Length/Pack (m)</TableHead>
                            <TableHead className="font-semibold">Price/Pack</TableHead>
                            <TableHead className="font-semibold">Price/m</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                                    No chain materials found.
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
                                    <TableCell>
                                        {material.pricePerMeter ? `£${material.pricePerMeter.toFixed(2)}` : '-'}
                                    </TableCell>
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

export default ChainTable;
