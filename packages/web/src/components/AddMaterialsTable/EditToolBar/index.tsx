import { Button } from "@mui/material";
import { GridSlotProps, GridRowModes, GridToolbarContainer } from "@mui/x-data-grid";
import AddIcon from '@mui/icons-material/Add';

export const EditToolbar = (props: GridSlotProps['toolbar']) => {
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
