import type { Material } from '@jewellery-catalogue/types';
import { ExternalLink } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface IAllMaterialsTableProps {
    materials: Array<Material>;
}

const AllMaterialsTable: React.FC<IAllMaterialsTableProps> = ({ materials }) => {
    const formatPrice = (value: number | null | undefined) => {
        if (value == null) return '';

        return `£${Number(value).toFixed(2)}`;
    };

    const renderPurchaseUrl = (url: string | null | undefined) => {
        if (!url) return null;

        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
            >
                <ExternalLink className="h-3 w-3" />
                View
            </a>
        );
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Diameter</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Colour</TableHead>
                        <TableHead>Wire Type</TableHead>
                        <TableHead>Metal Type</TableHead>
                        <TableHead>Price/m</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {materials.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                No materials found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        materials.map((material, index) => (
                            <TableRow key={material.id || `material-${index}`}>
                                <TableCell className="font-medium">{material.name}</TableCell>
                                <TableCell>{material.brand}</TableCell>
                                <TableCell>{material.type}</TableCell>
                                <TableCell>{material.diameter || '-'}</TableCell>
                                <TableCell>{renderPurchaseUrl(material.purchaseUrl)}</TableCell>
                                <TableCell>{(material as any).quantity || '-'}</TableCell>
                                <TableCell>{(material as any).colour || '-'}</TableCell>
                                <TableCell>{(material as any).wireType || '-'}</TableCell>
                                <TableCell>{(material as any).metalType || '-'}</TableCell>
                                <TableCell>{formatPrice((material as any).pricePerMeter)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default AllMaterialsTable;
