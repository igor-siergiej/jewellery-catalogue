import {
    type Bead,
    type Chain,
    type EarHook,
    type Material,
    MaterialType,
    type Wire,
} from '@jewellery-catalogue/types';
import Fuse from 'fuse.js';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearch } from '@/context/SearchContext';

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

function sortMaterials<T>(items: T[], field: string, dir: 'asc' | 'desc'): T[] {
    return [...items].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[field];
        const bVal = (b as Record<string, unknown>)[field];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return dir === 'asc' ? 1 : -1;
        if (bVal == null) return dir === 'asc' ? -1 : 1;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
}

const MaterialsTable: React.FC<IMaterialTableProps> = ({ materials, onMaterialUpdated }) => {
    const { searchQuery } = useSearch();
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const fuse = useMemo(
        () => new Fuse(materials, { keys: ['name', 'brand', 'materialCode'], threshold: 0.4 }),
        [materials]
    );

    const filteredMaterials = useMemo(() => {
        if (!searchQuery) return materials;
        return fuse.search(searchQuery).map((r) => r.item);
    }, [searchQuery, fuse, materials]);

    useEffect(() => {
        setCurrentPage(0);
    }, []);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(0);
    };

    const wireMaterials = filteredMaterials.filter((m): m is Wire => m.type === MaterialType.WIRE);
    const beadMaterials = filteredMaterials.filter((m): m is Bead => m.type === MaterialType.BEAD);
    const chainMaterials = filteredMaterials.filter((m): m is Chain => m.type === MaterialType.CHAIN);
    const earHookMaterials = filteredMaterials.filter((m): m is EarHook => m.type === MaterialType.EAR_HOOK);

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

    const getPaginatedMaterials = <T extends Material>(items: Array<T>): Array<T> => {
        const sorted = sortField ? sortMaterials(items, sortField, sortDirection) : items;
        const startIndex = currentPage * pageSize;
        return sorted.slice(startIndex, startIndex + pageSize);
    };

    const sortProps = { sortField, sortDirection, onSort: handleSort };

    return (
        <div className="space-y-4">
            <Tabs
                defaultValue="all"
                onValueChange={() => {
                    setCurrentPage(0);
                    setSortField(null);
                }}
            >
                <TabsList>
                    <TabsTrigger value="all">All Materials</TabsTrigger>
                    <TabsTrigger value="wire">Wire ({wireMaterials.length})</TabsTrigger>
                    <TabsTrigger value="bead">Bead ({beadMaterials.length})</TabsTrigger>
                    <TabsTrigger value="chain">Chain ({chainMaterials.length})</TabsTrigger>
                    <TabsTrigger value="ear-hook">Ear Hook ({earHookMaterials.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    <AllMaterialsTable
                        materials={getPaginatedMaterials(filteredMaterials)}
                        onMaterialUpdated={onMaterialUpdated}
                        {...sortProps}
                    />
                    <Pagination
                        totalMaterials={filteredMaterials.length}
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
                    <WireTable
                        materials={getPaginatedMaterials(wireMaterials)}
                        onMaterialUpdated={onMaterialUpdated}
                        {...sortProps}
                    />
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
                    <BeadTable
                        materials={getPaginatedMaterials(beadMaterials)}
                        onMaterialUpdated={onMaterialUpdated}
                        {...sortProps}
                    />
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
                        {...sortProps}
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
                        {...sortProps}
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
