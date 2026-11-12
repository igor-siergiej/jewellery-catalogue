import { type Material, MaterialType } from '@jewellery-catalogue/types';
import Fuse from 'fuse.js';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { MaterialsLedger, type MaterialSortDirection } from '@/components/MaterialsLedger';
import { StateView } from '@/components/StateView';
import { Button } from '@/components/ui/button';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    UNDERLINE_TAB_CLASS,
    UNDERLINE_TAB_LIST_CLASS,
} from '@/components/ui/tabs';
import { ADD_MATERIAL_PAGE } from '@/constants/routes';
import { useSearch } from '@/context/SearchContext';
import { useSearchAnalytics } from '@/hooks/useSearchAnalytics';
import { type MaterialColumnKey, type MaterialTab, sortValue } from '@/lib/materialColumns';
import { cn } from '@/lib/utils';

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
        <div className="flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalMaterials)} of {totalMaterials} materials
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={pageSize}
                    onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(0);
                    }}
                    aria-label="Rows per page"
                    className="h-11 cursor-pointer rounded-md border bg-card px-3 text-sm md:h-8"
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
                    aria-label="Previous page"
                    className="size-11 p-0 md:size-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.map((pageNum) => (
                    <Button
                        key={pageNum}
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                        className={cn(
                            'size-11 p-0 md:size-8',
                            currentPage === pageNum && 'border-primary bg-accent text-primary'
                        )}
                    >
                        {pageNum + 1}
                    </Button>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToNextPage(totalMaterials)}
                    disabled={currentPage === totalPages - 1}
                    aria-label="Next page"
                    className="size-11 p-0 md:size-8"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

const TABS: Array<{ value: MaterialTab; label: string }> = [
    { value: 'all', label: 'All' },
    { value: MaterialType.WIRE, label: 'Wire' },
    { value: MaterialType.BEAD, label: 'Beads' },
    { value: MaterialType.CHAIN, label: 'Chains' },
    { value: MaterialType.EAR_HOOK, label: 'Ear hooks' },
];

function sortMaterials(items: Material[], key: MaterialColumnKey, dir: MaterialSortDirection): Material[] {
    return [...items].sort((a, b) => {
        const aVal = sortValue(a, key);
        const bVal = sortValue(b, key);

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
    const [tab, setTab] = useState<MaterialTab>('all');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortKey, setSortKey] = useState<MaterialColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<MaterialSortDirection>('asc');

    const fuse = useMemo(
        () => new Fuse(materials, { keys: ['name', 'brand', 'materialCode'], threshold: 0.4 }),
        [materials]
    );

    const filteredMaterials = useMemo(() => {
        if (!searchQuery) return materials;

        return fuse.search(searchQuery).map((r) => r.item);
    }, [searchQuery, fuse, materials]);

    useSearchAnalytics('materials', filteredMaterials.length);

    const tabMaterials = tab === 'all' ? filteredMaterials : filteredMaterials.filter((m) => m.type === tab);
    const totalPages = Math.ceil(tabMaterials.length / pageSize);
    const effectivePage = Math.min(currentPage, Math.max(0, totalPages - 1));

    const handleSort = (key: MaterialColumnKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }

        setCurrentPage(0);
    };

    const goToNextPage = (totalMaterials: number) => {
        const pages = Math.ceil(totalMaterials / pageSize);

        if (currentPage < pages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    if (materials.length === 0) {
        return (
            <div className="rounded-md border bg-card">
                <StateView
                    kind="empty"
                    title="No materials yet"
                    body="Add your first material to start tracking stock."
                    action={
                        <Button asChild>
                            <Link to={ADD_MATERIAL_PAGE.route}>
                                <Plus /> Add material
                            </Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    const sorted = sortKey ? sortMaterials(tabMaterials, sortKey, sortDirection) : tabMaterials;
    const pageMaterials = sorted.slice(effectivePage * pageSize, effectivePage * pageSize + pageSize);

    return (
        <Tabs
            value={tab}
            onValueChange={(value) => {
                setTab(value as MaterialTab);
                setCurrentPage(0);
                setSortKey(null);
            }}
            className="min-w-0 space-y-4"
        >
            <TabsList className={cn(UNDERLINE_TAB_LIST_CLASS, 'max-w-full')}>
                {TABS.map(({ value, label }) => (
                    <TabsTrigger key={value} value={value} className={UNDERLINE_TAB_CLASS}>
                        {label}{' '}
                        <span className="ml-1 text-muted-foreground">
                            {value === 'all'
                                ? filteredMaterials.length
                                : filteredMaterials.filter((m) => m.type === value).length}
                        </span>
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value={tab} className="mt-0">
                <MaterialsLedger
                    materials={pageMaterials}
                    tab={tab}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    onMaterialUpdated={onMaterialUpdated}
                />
                <Pagination
                    totalMaterials={tabMaterials.length}
                    currentPage={effectivePage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    setCurrentPage={setCurrentPage}
                    goToNextPage={goToNextPage}
                    goToPreviousPage={goToPreviousPage}
                    goToPage={setCurrentPage}
                />
            </TabsContent>
        </Tabs>
    );
};

export default MaterialsTable;
