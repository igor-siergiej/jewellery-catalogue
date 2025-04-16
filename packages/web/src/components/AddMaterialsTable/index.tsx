import Box from '@mui/material/Box';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
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
import { Material } from '@jewellery-catalogue/types';
import { AddMaterialsTableProps, TableMaterial } from './types';
import { EditToolbar } from './EditToolBar';

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
        const actualMaterials = availableMaterials.reduce((acc, material) => {
            const matchedRow = rows.find(tableMaterial => tableMaterial.id === material.id);

            if (matchedRow) {
                return [...acc, { ...material, amount: matchedRow.quantity }];
            }

            return acc;
        }, [] as Array<Material>);

        setValue('materials', actualMaterials);
    }

    const processRowUpdate = (newRow: TableMaterial) => {
        const actualId = availableMaterials.find(material => material.name === newRow.name)?.id;

        if (!actualId) {
            throw new Error('Could not find a matching material name from availableMaterials');
        }

        const updatedRow = { ...newRow, isNew: false, id: actualId };

        const newRows = rows.map(row => (row.id === 'new' || row.id === actualId ? updatedRow : row));

        setSelectedMaterials(newRows)

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
            valueOptions: availableMaterials.filter(material => {
                const materialHasAlreadyBeenSelected = selectedMaterials.some((selectedMaterial) => selectedMaterial.name === material.name);
                return !materialHasAlreadyBeenSelected;

            }).map(material => material.name)
        },
        {
            field: 'quantity',
            headerName: 'Length (cm)/Quantity',
            flex: 0.40,
            type: 'number',
            align: 'left',
            headerAlign: 'left',
            editable: true,
            sortable: false,
            filterable: false
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
                            sx={{
                                color: 'primary.main',
                            }}
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

    return (
        <Box
            sx={{
                'height': 400,
                'width': '100%',
                '& .actions': {
                    color: 'text.secondary',
                },
                '& .textPrimary': {
                    color: 'text.primary',
                },
            }}
        >
            <DataGrid<TableMaterial>
                rows={rows}
                columns={columns}
                disableColumnMenu
                hideFooter
                hideFooterPagination
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
                slots={{ toolbar: EditToolbar }}
                slotProps={{
                    toolbar: { setRows, setRowModesModel },
                }}
            />
        </Box>
    );
};
