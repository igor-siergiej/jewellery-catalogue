import type { Design } from '@jewellery-catalogue/types';
import { AlertCircle, Edit, Eye } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DesignUpdateForm from '@/components/DesignUpdateForm';
import { Image } from '@/components/Image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VIEW_DESIGN_PAGE } from '@/constants/routes';

export interface ILowStockDesignsTableProps {
    designs: Array<Design>;
    onDesignUpdated?: () => void;
}

const LowStockDesignsTable: React.FC<ILowStockDesignsTableProps> = ({ designs, onDesignUpdated }) => {
    const navigate = useNavigate();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);

    const getSeverityBadge = (design: Design) => {
        const threshold = design.lowStockThreshold ?? 0;

        if (design.totalQuantity === 0) {
            return <Badge variant="destructive">Out of Stock</Badge>;
        } else if (design.totalQuantity === 1) {
            return <Badge className="bg-red-600">Critical</Badge>;
        } else if (design.totalQuantity < threshold) {
            return <Badge variant="secondary">Low</Badge>;
        }
        return <Badge variant="outline">Normal</Badge>;
    };

    const handleEdit = (design: Design) => {
        setSelectedDesign(design);
        setEditDialogOpen(true);
    };

    const handleView = (designId: string) => {
        navigate(VIEW_DESIGN_PAGE.getRoute(designId));
    };

    const handleSuccess = () => {
        setEditDialogOpen(false);
        setSelectedDesign(null);
        if (onDesignUpdated) {
            onDesignUpdated();
        }
    };

    const handleCancel = () => {
        setEditDialogOpen(false);
        setSelectedDesign(null);
    };

    return (
        <>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold">Image</TableHead>
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold">Total Quantity</TableHead>
                            <TableHead className="font-semibold">Stock Status</TableHead>
                            <TableHead className="font-semibold">Severity</TableHead>
                            <TableHead className="font-semibold">Price</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {designs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No low-stock designs.
                                </TableCell>
                            </TableRow>
                        ) : (
                            designs.map((design, index) => {
                                const threshold = design.lowStockThreshold ?? '-';

                                return (
                                    <TableRow key={design.id || `design-${index}`} className="hover:bg-muted/50">
                                        <TableCell>
                                            <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                                <Image imageId={design.imageId} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{design.name}</TableCell>
                                        <TableCell>{design.totalQuantity}</TableCell>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-500" />
                                            {design.totalQuantity} / {threshold} items
                                        </TableCell>
                                        <TableCell>{getSeverityBadge(design)}</TableCell>
                                        <TableCell>£{Number(design.price).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleView(design.id)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    <span className="sr-only">View design</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(design)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    <span className="sr-only">Edit design</span>
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
                    <DialogHeader>
                        <DialogTitle>Manage Design Inventory</DialogTitle>
                    </DialogHeader>
                    {selectedDesign && (
                        <DesignUpdateForm design={selectedDesign} onSuccess={handleSuccess} onCancel={handleCancel} />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default LowStockDesignsTable;
