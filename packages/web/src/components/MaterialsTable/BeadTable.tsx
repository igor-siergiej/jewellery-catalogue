import type { Bead } from '@jewellery-catalogue/types';
import { ExternalLink } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface IBeadTableProps {
    materials: Array<Bead>;
}

const BeadTable: React.FC<IBeadTableProps> = ({ materials }) => {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Colour</TableHead>
                        <TableHead>Diameter (mm)</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price/bead</TableHead>
                        <TableHead>Purchase URL</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {materials.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                No bead materials found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        materials.map((material) => (
                            <TableRow key={material.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">{material.name}</TableCell>
                                <TableCell>{material.brand}</TableCell>
                                <TableCell>{material.colour || '-'}</TableCell>
                                <TableCell>{material.diameter}</TableCell>
                                <TableCell>{material.quantity}</TableCell>
                                <TableCell>£{material.pricePerBead.toFixed(2)}</TableCell>
                                <TableCell>
                                    {material.purchaseUrl ? (
                                        <a
                                            href={material.purchaseUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            View
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default BeadTable;
