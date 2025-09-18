import { RequiredMaterial } from '@jewellery-catalogue/types';
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { AddMaterialsTableProps, TableMaterial } from './types';
import { getRequiredMaterial } from './util';

export const AddMaterialsTable: React.FC<AddMaterialsTableProps> = ({ setValue, availableMaterials }) => {
    const [rows, setRows] = useState<Array<TableMaterial>>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<Array<TableMaterial>>([]);

    const handleEditClick = (id: string) => {
        setRows(prevRows =>
            prevRows.map(row =>
                row.id === id ? { ...row, isEditing: true } : row
            )
        );
    };

    const handleSaveClick = (id: string) => {
        const rowToSave = rows.find(row => row.id === id);
        if (!rowToSave) return;

        if (rowToSave.isNew) {
            const actualId = availableMaterials.find(material => material.name === rowToSave.name)?.id;
            if (!actualId) {
                alert('Could not find a matching material name from availableMaterials');
                return;
            }

            const updatedRow = { ...rowToSave, isNew: false, isEditing: false, id: actualId };
            const newRows = rows.map(row => (row.id === id ? updatedRow : row));

            setSelectedMaterials(newRows);
            setRows(newRows);
            setMaterials(newRows);
        } else {
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === id ? { ...row, isEditing: false } : row
                )
            );
            setMaterials(rows.map(row => row.id === id ? { ...row, isEditing: false } : row));
        }
    };

    const handleDeleteClick = (id: string) => {
        const newRows = rows.filter(row => row.id !== id);
        setRows(newRows);
        setSelectedMaterials(newRows);
        setMaterials(newRows);
    };

    const handleCancelClick = (id: string) => {
        const editedRow = rows.find(row => row.id === id);

        if (editedRow?.isNew) {
            setRows(rows.filter(row => row.id !== id));
        } else {
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === id ? { ...row, isEditing: false } : row
                )
            );
        }
    };

    const setMaterials = (rows: Array<TableMaterial>) => {
        const actualMaterials = availableMaterials.reduce<Array<RequiredMaterial>>((acc, material) => {
            const matchedRow = rows.find(tableMaterial => tableMaterial.id === material.id);

            if (matchedRow) {
                return [...acc, getRequiredMaterial(material, matchedRow)];
            }

            return acc;
        }, []);

        setValue('materials', actualMaterials);
    };

    const handleMaterialChange = (id: string, name: string) => {
        setRows(prevRows =>
            prevRows.map(row =>
                row.id === id ? { ...row, name } : row
            )
        );
    };

    const handleRequiredChange = (id: string, required: number) => {
        setRows(prevRows =>
            prevRows.map(row =>
                row.id === id ? { ...row, required } : row
            )
        );
    };

    const getUnitLabel = (materialName: string) => {
        const material = availableMaterials.find(m => m.name === materialName);
        if (material?.type === 'WIRE' || material?.type === 'CHAIN') {
            return 'cm';
        }
        if (material?.type === 'BEAD' || material?.type === 'EAR_HOOK') {
            return 'pcs';
        }
        return '';
    };

    const formatValue = (value: number, materialName: string) => {
        const unit = getUnitLabel(materialName);
        return unit ? `${value} ${unit}` : value.toString();
    };

    const getAvailableMaterials = () => {
        return availableMaterials.filter((material) => {
            const materialHasAlreadyBeenSelected = selectedMaterials.some(selectedMaterial => selectedMaterial.name === material.name);
            return !materialHasAlreadyBeenSelected;
        });
    };

    const handleAddMaterial = () => {
        const hasNewRow = rows.some(row => row.isNew);
        if (hasNewRow) return;

        const newId = `new-${Date.now()}`;
        setRows(oldRows => [
            ...oldRows,
            { id: newId, name: '', required: 0, isNew: true, isEditing: true },
        ]);
    };

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <p className="text-muted-foreground">No materials added yet</p>
            <Button onClick={handleAddMaterial} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Material
            </Button>
        </div>
    );

    const TableHeader = () => (
        <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b font-medium text-sm">
            <div className="col-span-5">Material</div>
            <div className="col-span-5">Required Amount</div>
            <div className="col-span-2">Actions</div>
        </div>
    );

    const TableRow = ({ row }: { row: TableMaterial }) => (
        <div className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-muted/30 transition-colors">
            <div className="col-span-5 flex items-center">
                {row.isEditing
                    ? (
                            <Select
                                value={row.name}
                                onValueChange={value => handleMaterialChange(row.id, value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select material" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getAvailableMaterials().map(material => (
                                        <SelectItem key={material.id} value={material.name}>
                                            {material.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )
                    : (
                            <span>{row.name}</span>
                        )}
            </div>
            <div className="col-span-5 flex items-center">
                {row.isEditing
                    ? (
                            <div className="flex items-center gap-2 w-full">
                                <Input
                                    type="number"
                                    value={row.required}
                                    onChange={e => handleRequiredChange(row.id, Number(e.target.value))}
                                    className="flex-1"
                                    min="0"
                                    step="0.1"
                                />
                                <span className="text-sm text-muted-foreground min-w-[3ch]">
                                    {getUnitLabel(row.name)}
                                </span>
                            </div>
                        )
                    : (
                            <span>{formatValue(row.required, row.name)}</span>
                        )}
            </div>
            <div className="col-span-2 flex items-center gap-2">
                {row.isEditing
                    ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSaveClick(row.id)}
                                    className="h-8 w-8 p-0"
                                >
                                    <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancelClick(row.id)}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </>
                        )
                    : (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditClick(row.id)}
                                    className="h-8 w-8 p-0"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteClick(row.id)}
                                    className="h-8 w-8 p-0"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
            </div>
        </div>
    );

    const TableFooter = () => {
        const hasNewRow = rows.some(row => row.isNew);

        if (rows.length === 0 || hasNewRow) return null;

        return (
            <div className="p-4 border-t bg-muted/20">
                <Button
                    variant="outline"
                    onClick={handleAddMaterial}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Material
                </Button>
            </div>
        );
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            {rows.length === 0
                ? (
                        <EmptyState />
                    )
                : (
                        <>
                            <TableHeader />
                            {rows.map(row => (
                                <TableRow key={row.id} row={row} />
                            ))}
                            <TableFooter />
                        </>
                    )}
        </div>
    );
};
