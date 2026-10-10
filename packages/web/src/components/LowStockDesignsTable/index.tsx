import type { Design, DesignVariant } from '@jewellery-catalogue/types';
import { AlertCircle, Edit, Eye } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DesignUpdateForm from '@/components/DesignUpdateForm';
import { Image } from '@/components/Image';
import { DesktopOnly, MobileCard, MobileCardList } from '@/components/MobileCardList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VIEW_DESIGN_PAGE } from '@/constants/routes';
import type { LowStockDesignRow } from '@/utils/lowStock';

interface ILowStockDesignsTableProps {
    rows: LowStockDesignRow[];
    onDesignUpdated?: () => void;
}

const LowStockDesignsTable: React.FC<ILowStockDesignsTableProps> = ({ rows, onDesignUpdated }) => {
    const navigate = useNavigate();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);

    const getSeverityBadge = (quantity: number, threshold: number | undefined) => {
        const t = threshold ?? 0;
        if (quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
        if (quantity === 1) return <Badge className="bg-red-600">Critical</Badge>;
        if (quantity < t) return <Badge variant="secondary">Low</Badge>;
        return <Badge variant="outline">Normal</Badge>;
    };

    const handleEdit = (design: Design, variant?: DesignVariant) => {
        setSelectedDesign(design);
        setSelectedVariantId(variant?.id);
        setEditDialogOpen(true);
    };

    const handleView = (designId: string) => {
        navigate(VIEW_DESIGN_PAGE.getRoute(designId));
    };

    const handleSuccess = () => {
        setEditDialogOpen(false);
        setSelectedDesign(null);
        setSelectedVariantId(undefined);
        if (onDesignUpdated) onDesignUpdated();
    };

    const handleCancel = () => {
        setEditDialogOpen(false);
        setSelectedDesign(null);
        setSelectedVariantId(undefined);
    };

    return (
        <>
            <MobileCardList>
                {rows.length === 0 ? (
                    <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
                        No low-stock designs.
                    </p>
                ) : (
                    rows.map(({ design, variant }, index) => {
                        const quantity = variant ? variant.totalQuantity : design.totalQuantity;
                        const threshold = variant
                            ? (variant.lowStockThreshold ?? design.lowStockThreshold)
                            : design.lowStockThreshold;
                        const displayName = variant ? `${design.name} — ${variant.name}` : design.name;
                        const price = variant ? variant.price : design.price;
                        const rowKey = variant ? `${design.id}-${variant.id}` : design.id || `design-${index}`;

                        return (
                            <MobileCard
                                key={rowKey}
                                title={displayName}
                                badges={getSeverityBadge(quantity, threshold)}
                                media={
                                    <div className="h-14 w-14 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                        <Image imageId={design.imageIds?.[0] ?? ''} size="thumb" />
                                    </div>
                                }
                                facts={[
                                    { label: 'Stock', value: `${quantity} / ${threshold ?? '-'} items` },
                                    { label: 'Price', value: `£${Number(price).toFixed(2)}` },
                                ]}
                                actions={
                                    <>
                                        <Button
                                            variant="outline"
                                            className="h-10 flex-1"
                                            onClick={() => handleView(design.id)}
                                        >
                                            <Eye className="h-4 w-4" />
                                            View
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-10 flex-1"
                                            onClick={() => handleEdit(design, variant)}
                                        >
                                            <Edit className="h-4 w-4" />
                                            Edit
                                        </Button>
                                    </>
                                }
                            />
                        );
                    })
                )}
            </MobileCardList>
            <DesktopOnly className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold hidden md:table-cell">Image</TableHead>
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold hidden md:table-cell">Quantity</TableHead>
                            <TableHead className="font-semibold">Stock Status</TableHead>
                            <TableHead className="font-semibold">Severity</TableHead>
                            <TableHead className="font-semibold hidden md:table-cell">Price</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No low-stock designs.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map(({ design, variant }, index) => {
                                const quantity = variant ? variant.totalQuantity : design.totalQuantity;
                                const threshold = variant
                                    ? (variant.lowStockThreshold ?? design.lowStockThreshold)
                                    : design.lowStockThreshold;
                                const displayName = variant ? `${design.name} — ${variant.name}` : design.name;
                                const price = variant ? variant.price : design.price;
                                const rowKey = variant ? `${design.id}-${variant.id}` : design.id || `design-${index}`;

                                return (
                                    <TableRow key={rowKey} className="hover:bg-muted/50">
                                        <TableCell className="hidden md:table-cell">
                                            <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                                <Image imageId={design.imageIds?.[0] ?? ''} size="thumb" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{displayName}</TableCell>
                                        <TableCell className="hidden md:table-cell">{quantity}</TableCell>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-500" />
                                            {quantity} / {threshold ?? '-'} items
                                        </TableCell>
                                        <TableCell>{getSeverityBadge(quantity, threshold)}</TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            £{Number(price).toFixed(2)}
                                        </TableCell>
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
                                                    onClick={() => handleEdit(design, variant)}
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
            </DesktopOnly>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Design Inventory</DialogTitle>
                    </DialogHeader>
                    {selectedDesign && (
                        <DesignUpdateForm
                            design={selectedDesign}
                            onSuccess={handleSuccess}
                            onCancel={handleCancel}
                            initialVariantId={selectedVariantId}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default LowStockDesignsTable;
