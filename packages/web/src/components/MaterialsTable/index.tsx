import { Material } from '@jewellery-catalogue/types';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export interface IMaterialTableProps {
    materials: Array<Material>;
}

const MaterialsTable: React.FC<IMaterialTableProps> = ({ materials }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const totalPages = Math.ceil(materials.length / pageSize);
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const currentMaterials = materials.slice(startIndex, endIndex);

    const formatPrice = (value: number | null | undefined) => {
        if (value == null) return '';
        return `$${Number(value).toFixed(2)}`;
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

    const goToNextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToPage = (page: number) => {
        setCurrentPage(page);
    };

    const TableHeader = () => (
        <div className="grid grid-cols-12 gap-2 p-4 bg-muted/50 border-b font-medium text-sm">
            <div className="col-span-1">Name</div>
            <div className="col-span-1">Brand</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Diameter</div>
            <div className="col-span-1">URL</div>
            <div className="col-span-1">Quantity</div>
            <div className="col-span-1">Colour</div>
            <div className="col-span-1">Wire Type</div>
            <div className="col-span-1">Metal Type</div>
            <div className="col-span-3">Price Per Meter</div>
        </div>
    );

    const TableRow = ({ material }: { material: Material }) => (
        <div className="grid grid-cols-12 gap-2 p-4 border-b hover:bg-muted/30 transition-colors text-sm">
            <div className="col-span-1 truncate" title={material.name}>{material.name}</div>
            <div className="col-span-1 truncate" title={material.brand}>{material.brand}</div>
            <div className="col-span-1 truncate">{material.type}</div>
            <div className="col-span-1 truncate">{material.diameter}</div>
            <div className="col-span-1">{renderPurchaseUrl(material.purchaseUrl)}</div>
            <div className="col-span-1 truncate">{(material as any).quantity}</div>
            <div className="col-span-1 truncate">{(material as any).colour}</div>
            <div className="col-span-1 truncate">{(material as any).wireType}</div>
            <div className="col-span-1 truncate">{(material as any).metalType}</div>
            <div className="col-span-3 truncate">{formatPrice((material as any).pricePerMeter)}</div>
        </div>
    );

    const Pagination = () => {
        if (totalPages <= 1) return null;

        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(0, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                <div className="text-sm text-muted-foreground">
                    Showing
                    {' '}
                    {startIndex + 1}
                    {' '}
                    to
                    {' '}
                    {Math.min(endIndex, materials.length)}
                    {' '}
                    of
                    {' '}
                    {materials.length}
                    {' '}
                    materials
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(0);
                        }}
                        className="px-3 py-1 text-sm border rounded-md bg-background"
                    >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                    </select>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 0}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {pageNumbers.map(pageNum => (
                        <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="h-8 w-8 p-0"
                        >
                            {pageNum + 1}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages - 1}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    };

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <p className="text-muted-foreground">No materials found</p>
        </div>
    );

    return (
        <div className="border rounded-lg overflow-hidden">
            {materials.length === 0
                ? (
                        <EmptyState />
                    )
                : (
                        <>
                            <TableHeader />
                            {currentMaterials.map((material, index) => (
                                <TableRow key={material.id || `material-${index}`} material={material} />
                            ))}
                            <Pagination />
                        </>
                    )}
        </div>
    );
};

export default MaterialsTable;
