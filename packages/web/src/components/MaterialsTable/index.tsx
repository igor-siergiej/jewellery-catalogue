import {
    type Bead,
    type Chain,
    type EarHook,
    type Material,
    MaterialType,
    type Wire,
} from '@jewellery-catalogue/types';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import AllMaterialsTable from './AllMaterialsTable';
import BeadTable from './BeadTable';
import ChainTable from './ChainTable';
import EarHookTable from './EarHookTable';
import WireTable from './WireTable';

export interface IMaterialTableProps {
    materials: Array<Material>;
    onMaterialUpdated?: () => void;
}

interface PaginationProps {
    totalMaterials: number;
    currentPage: number;
    pageSize: number;
    setPageSize: (size: number) => void;
    setCurrentPage: (page: number) => void;
    goToNextPage: (totalMaterials: number) => void;
    goToPreviousPage: () => void;
    goToPage: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    totalMaterials,
    currentPage,
    pageSize,
    setPageSize,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,
}) => {
    const totalPages = Math.ceil(totalMaterials / pageSize);
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;

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
                Showing {startIndex + 1} to {Math.min(endIndex, totalMaterials)} of {totalMaterials} materials
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
                {pageNumbers.map((pageNum) => (
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
                    onClick={() => goToNextPage(totalMaterials)}
                    disabled={currentPage === totalPages - 1}
                    className="h-8 w-8 p-0"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

const MaterialsTable: React.FC<IMaterialTableProps> = ({ materials, onMaterialUpdated }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Filter materials by type
    const wireMaterials = materials.filter((m): m is Wire => m.type === MaterialType.WIRE);
    const beadMaterials = materials.filter((m): m is Bead => m.type === MaterialType.BEAD);
    const chainMaterials = materials.filter((m): m is Chain => m.type === MaterialType.CHAIN);
    const earHookMaterials = materials.filter((m): m is EarHook => m.type === MaterialType.EAR_HOOK);

    const goToNextPage = (totalMaterials: number) => {
        const totalPages = Math.ceil(totalMaterials / pageSize);

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

    if (materials.length === 0) {
        return (
            <div className="border rounded-lg overflow-hidden">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Package />
                        </EmptyMedia>
                        <EmptyTitle>No Materials Found</EmptyTitle>
                        <EmptyDescription>Add materials to your inventory to see them listed here.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </div>
        );
    }

    const getPaginatedMaterials = <T extends Material>(materials: Array<T>) => {
        const startIndex = currentPage * pageSize;
        const endIndex = startIndex + pageSize;

        return materials.slice(startIndex, endIndex);
    };

    return (
        <div className="space-y-4">
            <Tabs defaultValue="all" onValueChange={() => setCurrentPage(0)}>
                <TabsList>
                    <TabsTrigger value="all">All Materials</TabsTrigger>
                    <TabsTrigger value="wire">Wire ({wireMaterials.length})</TabsTrigger>
                    <TabsTrigger value="bead">Bead ({beadMaterials.length})</TabsTrigger>
                    <TabsTrigger value="chain">Chain ({chainMaterials.length})</TabsTrigger>
                    <TabsTrigger value="ear-hook">Ear Hook ({earHookMaterials.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    <AllMaterialsTable
                        materials={getPaginatedMaterials(materials)}
                        onMaterialUpdated={onMaterialUpdated}
                    />
                    <Pagination
                        totalMaterials={materials.length}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        setPageSize={setPageSize}
                        setCurrentPage={setCurrentPage}
                        goToNextPage={goToNextPage}
                        goToPreviousPage={goToPreviousPage}
                        goToPage={goToPage}
                    />
                </TabsContent>

                <TabsContent value="wire">
                    <WireTable materials={getPaginatedMaterials(wireMaterials)} onMaterialUpdated={onMaterialUpdated} />
                    <Pagination
                        totalMaterials={wireMaterials.length}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        setPageSize={setPageSize}
                        setCurrentPage={setCurrentPage}
                        goToNextPage={goToNextPage}
                        goToPreviousPage={goToPreviousPage}
                        goToPage={goToPage}
                    />
                </TabsContent>

                <TabsContent value="bead">
                    <BeadTable materials={getPaginatedMaterials(beadMaterials)} onMaterialUpdated={onMaterialUpdated} />
                    <Pagination
                        totalMaterials={beadMaterials.length}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        setPageSize={setPageSize}
                        setCurrentPage={setCurrentPage}
                        goToNextPage={goToNextPage}
                        goToPreviousPage={goToPreviousPage}
                        goToPage={goToPage}
                    />
                </TabsContent>

                <TabsContent value="chain">
                    <ChainTable
                        materials={getPaginatedMaterials(chainMaterials)}
                        onMaterialUpdated={onMaterialUpdated}
                    />
                    <Pagination
                        totalMaterials={chainMaterials.length}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        setPageSize={setPageSize}
                        setCurrentPage={setCurrentPage}
                        goToNextPage={goToNextPage}
                        goToPreviousPage={goToPreviousPage}
                        goToPage={goToPage}
                    />
                </TabsContent>

                <TabsContent value="ear-hook">
                    <EarHookTable
                        materials={getPaginatedMaterials(earHookMaterials)}
                        onMaterialUpdated={onMaterialUpdated}
                    />
                    <Pagination
                        totalMaterials={earHookMaterials.length}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        setPageSize={setPageSize}
                        setCurrentPage={setCurrentPage}
                        goToNextPage={goToNextPage}
                        goToPreviousPage={goToPreviousPage}
                        goToPage={goToPage}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default MaterialsTable;
