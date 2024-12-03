import { Box, Button, Divider, Typography } from '@mui/material';
import { useState } from 'react';
import { Control, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { IFormDesign } from '../../pages/AddDesign/types';
import { Material } from '../../types';
import AddMaterialFields from './AddMaterialsFields';
import AddIcon from '@mui/icons-material/Add';

interface AddMaterialsFormProps {
    setValue: UseFormSetValue<IFormDesign>;
    control: Control<IFormDesign, any>;
    register: UseFormRegister<IFormDesign>;
    availableMaterials: Array<Material>;
}
// TODO: Should this be a form in of itself??
const AddMaterialsForm: React.FC<AddMaterialsFormProps> = ({
    availableMaterials,
}) => {
    const [currentMaterials, setCurrentMaterials] = useState<Array<Material>>(
        []
    );
    const [showAddMaterialForm, setShowAddMaterialForm] =
        useState<boolean>(false);

    return (
        <Box>
            <Typography variant="subtitle1">
                Enter Materials required for the design:
            </Typography>

            <Divider
                variant="fullWidth"
                sx={{ marginTop: 1, marginBottom: 2 }}
            />

            {currentMaterials.map((material) => {
                return (
                    <Typography key={material.name}>{material.name}</Typography>
                );
            })}

            {showAddMaterialForm ? (
                <AddMaterialFields
                    availableMaterials={availableMaterials}
                    setCurrentMaterials={(materials) => {
                        setCurrentMaterials(materials);
                        setShowAddMaterialForm(false);
                    }}
                    currentMaterials={currentMaterials}
                />
            ) : (
                <Button
                    variant="contained"
                    onClick={() => setShowAddMaterialForm(true)}
                    endIcon={<AddIcon />}
                >
                    Add Material
                </Button>
            )}
        </Box>
    );
};

export default AddMaterialsForm;
