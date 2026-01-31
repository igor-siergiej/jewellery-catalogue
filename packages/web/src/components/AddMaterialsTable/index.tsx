import type { Material, RequiredMaterial } from '@jewellery-catalogue/types';
import { Edit3, Package, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ADD_MATERIAL_PAGE } from '@/constants/routes';
import { MATERIAL_TYPE_LABELS, METAL_TYPE_LABELS, WIRE_TYPE_LABELS } from '@/lib/materialLabels';
import { cn } from '@/lib/utils';
import type { AddMaterialsTableProps, TableMaterial } from './types';
import { getRequiredMaterial } from './util';

interface TableRowProps {
    row: TableMaterial;
    getAvailableMaterials: (editingRowKey?: string) => Array<Material>;
    handleMaterialChange: (rowKey: string, newMaterialId: string) => void;
    handleRequiredChange: (rowKey: string, required: number) => void;
    getInputStep: (materialId: string) => number;
    getUnitLabel: (materialId: string) => string;
    formatValue: (value: number, materialId: string) => string;
    handleSaveClick: (rowKey: string) => void;
    handleCancelClick: (rowKey: string) => void;
    handleEditClick: (rowKey: string) => void;
    handleDeleteClick: (rowKey: string) => void;
    getMaterialById: (materialId: string) => Material | undefined;
}

interface MaterialAttributeBadgesProps {
    material: Material;
}

const MaterialAttributeBadges: React.FC<MaterialAttributeBadgesProps> = ({ material }) => {
    const badges: React.ReactNode[] = [];

    // Material Type badge - all materials
    badges.push(
        <Badge key="type" variant="secondary" className="capitalize">
            {MATERIAL_TYPE_LABELS[material.type]}
        </Badge>
    );

    // Type-specific attributes
    if (material.type === 'BEAD' && material.colour) {
        badges.push(
            <Badge key="colour" variant="secondary" className="capitalize">
                {material.colour}
            </Badge>
        );
    } else if (
        (material.type === 'WIRE' || material.type === 'CHAIN' || material.type === 'EAR_HOOK') &&
        material.metalType
    ) {
        badges.push(
            <Badge key="metal" variant="outline">
                {METAL_TYPE_LABELS[material.metalType]}
            </Badge>
        );
    }

    if ((material.type === 'WIRE' || material.type === 'CHAIN' || material.type === 'EAR_HOOK') && material.wireType) {
        badges.push(
            <Badge key="wireType" variant="secondary">
                {WIRE_TYPE_LABELS[material.wireType]}
            </Badge>
        );
    }

    return <>{badges}</>;
};

const TableRow: React.FC<TableRowProps> = ({
    row,
    getAvailableMaterials,
    handleMaterialChange,
    handleRequiredChange,
    getInputStep,
    getUnitLabel,
    formatValue,
    handleSaveClick,
    handleCancelClick,
    handleEditClick,
    handleDeleteClick,
    getMaterialById,
}) => (
    <div className="grid grid-cols-14 gap-4 p-4 border-b hover:bg-muted/30 transition-colors">
        <div className="col-span-4 flex items-center">
            {row.isEditing ? (
                <Select
                    value={row.id.startsWith('new-') ? '' : row.id}
                    onValueChange={(value) => handleMaterialChange(row.rowKey, value)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                        {getAvailableMaterials(row.rowKey).map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                                {material.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <span>{row.name}</span>
            )}
        </div>
        <div className="col-span-3 flex items-center gap-1.5 flex-wrap">
            {(() => {
                if (row.id.startsWith('new-')) {
                    return <span className="text-sm text-muted-foreground">-</span>;
                }
                const material = getMaterialById(row.id);
                return material ? <MaterialAttributeBadges material={material} /> : null;
            })()}
        </div>
        <div className="col-span-5 flex items-center">
            {row.isEditing ? (
                <div className="flex items-center gap-2 w-full">
                    <Input
                        type="number"
                        value={row.required}
                        onChange={(e) => handleRequiredChange(row.rowKey, Number(e.target.value))}
                        className="flex-1"
                        min="0"
                        step={!row.id.startsWith('new-') ? getInputStep(row.id) : 0.1}
                        disabled={row.id.startsWith('new-')}
                        placeholder={row.id.startsWith('new-') ? 'Select material first' : '0'}
                    />
                    {!row.id.startsWith('new-') && (
                        <span className="text-sm text-muted-foreground min-w-[3ch]">{getUnitLabel(row.id)}</span>
                    )}
                </div>
            ) : (
                <span>{formatValue(row.required, row.id)}</span>
            )}
        </div>
        <div className="col-span-2 flex items-center gap-2">
            {row.isEditing ? (
                <>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveClick(row.rowKey)}
                        className="h-8 w-8 p-0"
                    >
                        <Save className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelClick(row.rowKey)}
                        className="h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(row.rowKey)}
                        className="h-8 w-8 p-0"
                    >
                        <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(row.rowKey)}
                        className="h-8 w-8 p-0"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </>
            )}
        </div>
    </div>
);

export const AddMaterialsTable: React.FC<AddMaterialsTableProps> = ({
    setValue,
    availableMaterials,
    hasError = false,
    value = [],
}) => {
    const [rows, setRows] = useState<Array<TableMaterial>>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<Array<TableMaterial>>([]);
    const [originalRowData, setOriginalRowData] = useState<Record<string, TableMaterial>>({});

    useEffect(() => {
        // Only clear rows if there are no saved materials AND no rows are currently being edited
        const hasEditingRows = rows.some((row) => row.isEditing || row.isNew);
        if (value.length === 0 && rows.length > 0 && !hasEditingRows) {
            setRows([]);
            setSelectedMaterials([]);
            setOriginalRowData({});
        }
    }, [value.length, rows]);

    const handleEditClick = (rowKey: string) => {
        setRows((prevRows) =>
            prevRows.map((row) => {
                if (row.rowKey === rowKey) {
                    setOriginalRowData((prev) => ({ ...prev, [rowKey]: { ...row } }));

                    return { ...row, isEditing: true };
                }

                return row;
            })
        );
    };

    const handleSaveClick = (rowKey: string) => {
        const rowToSave = rows.find((row) => row.rowKey === rowKey);

        if (!rowToSave) return;

        if (rowToSave.isNew) {
            if (!rowToSave.id || rowToSave.id.startsWith('new-')) {
                alert('Please select a material');

                return;
            }

            if (!rowToSave.required || rowToSave.required <= 0) {
                alert('Please enter a valid required amount');

                return;
            }

            const updatedRow = { ...rowToSave, isNew: false, isEditing: false };
            const newRows = rows.map((row) => (row.rowKey === rowKey ? updatedRow : row));

            setSelectedMaterials(newRows.filter((row) => !row.isNew && !row.isEditing));
            setRows(newRows);
            setMaterials(newRows);
        } else {
            if (!rowToSave.required || rowToSave.required <= 0) {
                alert('Please enter a valid required amount');

                return;
            }

            const updatedRows = rows.map((row) => (row.rowKey === rowKey ? { ...row, isEditing: false } : row));

            setRows(updatedRows);
            setSelectedMaterials(updatedRows.filter((row) => !row.isNew && !row.isEditing));
            setMaterials(updatedRows);

            // Clean up original data after successful save
            setOriginalRowData((prev) => {
                const newData = { ...prev };

                delete newData[rowKey];

                return newData;
            });
        }
    };

    const handleDeleteClick = (rowKey: string) => {
        const newRows = rows.filter((row) => row.rowKey !== rowKey);

        setRows(newRows);
        setSelectedMaterials(newRows.filter((row) => !row.isNew && !row.isEditing));
        setMaterials(newRows);
    };

    const handleCancelClick = (rowKey: string) => {
        const editedRow = rows.find((row) => row.rowKey === rowKey);

        if (editedRow?.isNew) {
            setRows(rows.filter((row) => row.rowKey !== rowKey));
        } else {
            // Restore original data
            const original = originalRowData[rowKey];

            if (original) {
                setRows((prevRows) =>
                    prevRows.map((row) => (row.rowKey === rowKey ? { ...original, isEditing: false } : row))
                );
                // Clean up original data
                setOriginalRowData((prev) => {
                    const newData = { ...prev };

                    delete newData[rowKey];

                    return newData;
                });
            } else {
                setRows((prevRows) =>
                    prevRows.map((row) => (row.rowKey === rowKey ? { ...row, isEditing: false } : row))
                );
            }
        }
    };

    const setMaterials = (rows: Array<TableMaterial>) => {
        const actualMaterials: Array<RequiredMaterial> = [];

        const savedRows = rows.filter((row) => !row.isNew && !row.isEditing);

        for (const material of availableMaterials) {
            const matchedRow = savedRows.find((tableMaterial) => tableMaterial.id === material.id);

            if (matchedRow) {
                const requiredMaterial = getRequiredMaterial(material, matchedRow);
                actualMaterials.push(requiredMaterial);
            }
        }

        setValue('materials', actualMaterials, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    };

    const handleMaterialChange = (rowKey: string, newMaterialId: string) => {
        const material = availableMaterials.find((m) => m.id === newMaterialId);

        if (!material) return;

        setRows((prevRows) =>
            prevRows.map((row) =>
                row.rowKey === rowKey ? { ...row, id: newMaterialId, name: material.name, required: 0 } : row
            )
        );
    };

    const handleRequiredChange = (rowKey: string, required: number) => {
        setRows((prevRows) => prevRows.map((row) => (row.rowKey === rowKey ? { ...row, required } : row)));
    };

    const getMaterialById = (materialId: string) => {
        return availableMaterials.find((m) => m.id === materialId);
    };

    const getUnitLabel = (materialId: string) => {
        const material = getMaterialById(materialId);

        if (material?.type === 'WIRE' || material?.type === 'CHAIN') {
            return 'cm';
        }

        if (material?.type === 'BEAD' || material?.type === 'EAR_HOOK') {
            return 'pcs';
        }

        return '';
    };

    const getInputStep = (materialId: string) => {
        const material = getMaterialById(materialId);

        if (material?.type === 'WIRE' || material?.type === 'CHAIN') {
            return 0.1;
        }

        if (material?.type === 'BEAD' || material?.type === 'EAR_HOOK') {
            return 1;
        }

        return 0.1;
    };

    const formatValue = (value: number, materialId: string) => {
        const unit = getUnitLabel(materialId);

        return unit ? `${value} ${unit}` : value.toString();
    };

    const getAvailableMaterials = (editingRowKey?: string) => {
        return availableMaterials.filter((material) => {
            const materialHasAlreadyBeenSelected = selectedMaterials.some((selectedMaterial) => {
                // If we're editing a row, allow its current material to be shown
                if (editingRowKey && selectedMaterial.rowKey === editingRowKey) {
                    return false;
                }

                return selectedMaterial.id === material.id;
            });

            return !materialHasAlreadyBeenSelected;
        });
    };

    const handleAddMaterial = () => {
        const hasNewRow = rows.some((row) => row.isNew);

        if (hasNewRow) return;

        const newRowKey = `row-${Date.now()}`;

        setRows((oldRows) => [
            ...oldRows,
            { rowKey: newRowKey, id: `new-${Date.now()}`, name: '', required: 0, isNew: true, isEditing: true },
        ]);
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            {rows.length === 0 ? (
                <EmptyState
                    hasError={hasError}
                    availableMaterials={availableMaterials}
                    handleAddMaterial={handleAddMaterial}
                />
            ) : (
                <>
                    <TableHeader />
                    {rows.map((row) => (
                        <TableRow
                            key={row.rowKey}
                            row={row}
                            getAvailableMaterials={getAvailableMaterials}
                            handleMaterialChange={handleMaterialChange}
                            handleRequiredChange={handleRequiredChange}
                            getInputStep={getInputStep}
                            getUnitLabel={getUnitLabel}
                            formatValue={formatValue}
                            handleSaveClick={handleSaveClick}
                            handleCancelClick={handleCancelClick}
                            handleEditClick={handleEditClick}
                            handleDeleteClick={handleDeleteClick}
                            getMaterialById={getMaterialById}
                        />
                    ))}
                    <TableFooter
                        handleAddMaterial={handleAddMaterial}
                        rows={rows}
                        availableMaterials={getAvailableMaterials()}
                    />
                </>
            )}
        </div>
    );
};

const EmptyState: React.FC<{
    availableMaterials: Array<Material>;
    hasError: boolean;
    handleAddMaterial: () => void;
}> = ({ availableMaterials, hasError, handleAddMaterial }) => {
    const hasMaterials = availableMaterials.length > 0;

    return (
        <div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
            <div className={cn('rounded-full p-1', hasError ? 'bg-destructive/10' : 'bg-muted')}>
                <Package className={cn('h-6 w-6', hasError ? 'text-destructive' : 'text-muted-foreground')} />
            </div>
            <div className="space-y-1">
                <p className={cn('text-sm font-medium', hasError && 'text-destructive')}>
                    {hasMaterials ? 'No materials added' : 'No materials available'}
                </p>
                <p className={cn('text-sm', hasError ? 'text-destructive' : 'text-muted-foreground')}>
                    {hasMaterials
                        ? 'Add materials to calculate the design price'
                        : 'Create materials in your library first'}
                </p>
            </div>
            {hasMaterials && (
                <Button type="button" onClick={handleAddMaterial} size="sm" className="gap-2 mt-2">
                    <Plus className="h-4 w-4" />
                    Add Material
                </Button>
            )}
        </div>
    );
};

const TableHeader = () => (
    <div className="grid grid-cols-14 gap-4 p-4 bg-muted/50 border-b font-medium text-sm">
        <div className="col-span-4">Material</div>
        <div className="col-span-3">Type & Attributes</div>
        <div className="col-span-5">Required Length/Quantity</div>
        <div className="col-span-2">Actions</div>
    </div>
);

const TableFooter: React.FC<{
    rows: Array<TableMaterial>;
    handleAddMaterial: () => void;
    availableMaterials: Array<Material>;
}> = ({ rows, handleAddMaterial, availableMaterials }) => {
    const navigate = useNavigate();
    const hasNewRow = rows.some((row) => row.isNew);

    if (rows.length === 0 || hasNewRow) return null;

    const noMaterialsLeft = availableMaterials.length === 0;

    return (
        <div className="p-4 border-t bg-muted/20">
            {noMaterialsLeft ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">All materials have been added.</span>
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => navigate(ADD_MATERIAL_PAGE.route)}
                        className="h-auto p-0 text-sm"
                    >
                        Create more materials
                    </Button>
                    <span className="text-sm text-muted-foreground">to add them to this design.</span>
                </div>
            ) : (
                <Button type="button" variant="outline" onClick={handleAddMaterial} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Material
                </Button>
            )}
        </div>
    );
};
