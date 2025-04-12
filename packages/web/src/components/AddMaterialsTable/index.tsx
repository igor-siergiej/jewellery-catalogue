import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
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
    GridToolbarContainer,
    GridActionsCellItem,
    GridEventListener,
    GridRowId,
    GridRowEditStopReasons,
    GridSlotProps,
} from '@mui/x-data-grid';
import { useState } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { FormDesign, Material } from '@jewellery-catalogue/types';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        setRows: React.Dispatch<React.SetStateAction<ReadonlyArray<TableMaterial>>>;
        setRowModesModel: React.Dispatch<React.SetStateAction<GridRowModesModel>>;
    }
}

type TableMaterial = Pick<Material, 'id' | 'name' | 'quantity'> & { isNew?: boolean };

const EditToolbar = (props: GridSlotProps['toolbar']) => {
    const { setRows, setRowModesModel } = props;

    const handleClick = () => {
        setRows(oldRows => [
            ...oldRows,
            { id: 'new', name: '', quantity: 0 },
        ]);
        setRowModesModel(oldModel => ({
            ...oldModel,
            ['new']: { mode: GridRowModes.Edit, fieldToFocus: 'name' },
        }));
    };

    return (
        <GridToolbarContainer>
            <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
                Add Material
            </Button>
        </GridToolbarContainer>
    );
};

export interface AddMaterialsTableProps {
    setValue: UseFormSetValue<FormDesign>;
    availableMaterials: Array<Material>;
}

export const AddMaterialsTable: React.FC<AddMaterialsTableProps> = ({ setValue, availableMaterials }) => {
    const [rows, setRows] = useState<GridRowsProp<TableMaterial>>([]);
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

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

    const processRowUpdate = (newRow: TableMaterial) => {
        const actualId = availableMaterials.find(material => material.name === newRow.name)?.id;

        if (!actualId) {
            throw new Error('Could not find a matching material name from availableMaterials');
        }

        const updatedRow = { ...newRow, isNew: false, id: actualId };

        const newRows = rows.map(row => (row.id === 'new' ? updatedRow : row));
        setRows(newRows);

        const actualMaterials = availableMaterials.reduce((acc, material) => {
            const matchedRow = newRows.find(tableMaterial => tableMaterial.id === material.id);

            if (matchedRow) {
                return [...acc, { ...material, amount: matchedRow.quantity }];
            }

            return acc;
        }, [] as Array<Material>);

        setValue('materials', actualMaterials);
        return updatedRow;
    };

    const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
        setRowModesModel(newRowModesModel);
    };

    // TODO: need to not show the materials that have been selected
    const columns: Array<GridColDef<TableMaterial>> = [
        {
            field: 'name',
            headerName: 'Material',
            editable: true,
            flex: 0.40,
            type: 'singleSelect',
            valueOptions: availableMaterials.map(material => material.name),
        },
        {
            field: 'quantity',
            headerName: 'Length (cm)/Quantity',
            flex: 0.40,
            type: 'number',
            align: 'left',
            headerAlign: 'left',
            editable: true,
        },
        {
            field: 'actions',
            type: 'actions',
            flex: 0.2,
            headerName: 'Actions',
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

    // TODO: Need to remove all the default table crap like pagination and filtering
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
