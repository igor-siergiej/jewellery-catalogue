import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import {
    GridRowsProp,
    GridRowModesModel,
    GridRowModes,
    DataGrid,
    GridColDef,
    GridActionsCellItem,
    GridEventListener,
    GridRowId,
    GridRowEditStopReasons,
} from '@mui/x-data-grid';
import { useState } from 'react';
import { RequiredMaterial } from '@jewellery-catalogue/types';
import { AddMaterialsTableProps, TableMaterial } from './types';
import { getRequiredMaterial } from './util';

export const AddMaterialsTable: React.FC<AddMaterialsTableProps> = ({ setValue, availableMaterials }) => {
    const [rows, setRows] = useState<GridRowsProp<TableMaterial>>([]);
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
    const [selectedMaterials, setSelectedMaterials] = useState<Array<TableMaterial>>([]);

    const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
        if (params.reason === GridRowEditStopReasons.rowFocusOut) {
            event.defaultMuiPrevented = true;
        }
    };

    const handleEditClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
    };

    const handleSaveClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    };

    const handleDeleteClick = (id: GridRowId) => () => {
        setRows(rows.filter(row => row.id !== id));
    };

    const handleCancelClick = (id: GridRowId) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
        });

        const editedRow = rows.find(row => row.id === id);

        if (editedRow !== undefined && editedRow.isNew) {
            setRows(rows.filter(row => row.id !== id));
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

    const processRowUpdate = (newRow: TableMaterial) => {
        const actualId = availableMaterials.find(material => material.name === newRow.name)?.id;

        if (!actualId) {
            throw new Error('Could not find a matching material name from availableMaterials');
        }

        const updatedRow = { ...newRow, isNew: false, id: actualId };

        const newRows = rows.map(row => (row.id === newRow.id || row.id === actualId ? updatedRow : row));

        setSelectedMaterials(newRows);

        setRows(newRows);
        setMaterials(newRows);

        return updatedRow;
    };

    const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
        setRowModesModel(newRowModesModel);
    };

    const columns: Array<GridColDef<TableMaterial>> = [
        {
            field: 'name',
            headerName: 'Material',
            editable: true,
            flex: 0.40,
            sortable: false,
            filterable: false,
            type: 'singleSelect',
            valueOptions: availableMaterials.filter((material) => {
                const materialHasAlreadyBeenSelected = selectedMaterials.some(selectedMaterial => selectedMaterial.name === material.name);
                return !materialHasAlreadyBeenSelected;
            }).map(material => material.name)
        },
        {
            field: 'required',
            headerName: 'Required Amount',
            flex: 0.40,
            type: 'number',
            align: 'left',
            headerAlign: 'left',
            editable: true,
            sortable: false,
            filterable: false,
            valueFormatter: (value, row) => {
                if (!availableMaterials.length) return value;

                // TODO: move this into a util function
                const material = availableMaterials.find(m => m.name === row.name);
                if (material?.type === 'WIRE' || material?.type === 'CHAIN') {
                    return `${value} cm`;
                }
                if (material?.type === 'BEAD' || material?.type === 'EAR_HOOK') {
                    return `${value} pcs`;
                }
                return value;
            }
        },
        {
            field: 'actions',
            type: 'actions',
            flex: 0.2,
            headerName: 'Actions',
            sortable: false,
            filterable: false,
            cellClassName: 'actions',
            getActions: ({ id }) => {
                const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

                if (isInEditMode) {
                    return [
                        <GridActionsCellItem
                            icon={<SaveIcon />}
                            label="Save"
                            onClick={handleSaveClick(id)}
                        />,
                        <GridActionsCellItem
                            icon={<CancelIcon />}
                            label="Cancel"
                            className="textPrimary"
                            onClick={handleCancelClick(id)}
                            color="inherit"
                        />,
                    ];
                }

                return [
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Edit"
                        className="textPrimary"
                        onClick={handleEditClick(id)}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={handleDeleteClick(id)}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    const handleAddMaterial = () => {
        const hasNewRow = rows.some(row => row.isNew);
        if (hasNewRow) return;

        const newId = `new-${Date.now()}`;
        setRows(oldRows => [
            ...oldRows,
            { id: newId, name: '', required: 0, isNew: true },
        ]);
        setRowModesModel(oldModel => ({
            ...oldModel,
            [newId]: { mode: GridRowModes.Edit, fieldToFocus: 'name' },
        }));
    };

    const CustomNoRowsOverlay = () => (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2,
            }}
        >
            <Box>No materials added yet</Box>
            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddMaterial}
                size="small"
            >
                Add Material
            </Button>
        </Box>
    );

    const CustomFooter = () => {
        const hasNewRow = rows.some(row => row.isNew);

        if (rows.length === 0 || hasNewRow) return null;

        return (
            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddMaterial}
                    size="small"
                >
                    Add Material
                </Button>
            </Box>
        );
    };

    return (
        <Box
            sx={{
                height: 400,
                width: '100%',
            }}
        >
            <DataGrid<TableMaterial>
                rows={rows}
                columns={columns}
                disableColumnMenu
                hideFooterPagination
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
                slots={{
                    noRowsOverlay: CustomNoRowsOverlay,
                    footer: CustomFooter,
                }}
                sx={{
                    '& .MuiDataGrid-overlay': {
                        height: '300px',
                    },
                }}
            />
        </Box>
    );
};
