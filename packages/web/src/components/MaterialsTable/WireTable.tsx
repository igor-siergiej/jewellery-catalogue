import type { Wire } from '@jewellery-catalogue/types';
import { ExternalLink } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { METAL_TYPE_LABELS, WIRE_TYPE_LABELS } from '@/lib/materialLabels';

export interface IWireTableProps {
    materials: Array<Wire>;
}

const WireTable: React.FC<IWireTableProps> = ({ materials }) => {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Wire Type</TableHead>
                        <TableHead>Metal Type</TableHead>
                        <TableHead>Diameter (mm)</TableHead>
                        <TableHead>Length (m)</TableHead>
                        <TableHead>Price/m</TableHead>
                        <TableHead>Purchase URL</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {materials.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                No wire materials found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        materials.map((material) => (
                            <TableRow key={material.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">{material.name}</TableCell>
                                <TableCell>{material.brand}</TableCell>
                                <TableCell>{WIRE_TYPE_LABELS[material.wireType]}</TableCell>
                                <TableCell>{METAL_TYPE_LABELS[material.metalType]}</TableCell>
                                <TableCell>{material.diameter}</TableCell>
                                <TableCell>{material.length}</TableCell>
                                <TableCell>£{material.pricePerMeter.toFixed(2)}</TableCell>
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

export default WireTable;
