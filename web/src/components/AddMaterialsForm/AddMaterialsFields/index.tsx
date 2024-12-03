import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { Material } from '../../../types';

interface AddMaterialFieldsProps {
    availableMaterials: Array<Material>;
    setCurrentMaterials: (materials: Array<Material>) => void;
    currentMaterials: Array<Material>;
}

const AddMaterialFields: React.FC<AddMaterialFieldsProps> = ({
    availableMaterials,
    setCurrentMaterials,
    currentMaterials,
}) => {
    const [quantity, setQuantity] = useState<string | number>();
    const [materialName, setMaterialName] = useState('');
    const [materialError, setMaterialError] = useState(false);
    const [quantityError, setQuantityError] = useState(false);

    const onClick = useCallback(() => {
        if (!materialName) {
            setMaterialError(true);
        }

        if (!quantity) {
            setQuantityError(true);
        }

        const material = availableMaterials.find(
            (searchMaterial) => searchMaterial.name === materialName
        );

        if (!material) {
            return;
        }
        setCurrentMaterials([...currentMaterials, material]);
    }, [materialName]);

    return (
        <>
            <Box
                sx={{
                    marginTop: 2,
                    marginBottom: 2,
                }}
            >
                <FormControl variant="filled" fullWidth>
                    <InputLabel error={materialError}>
                        {'Select Material'}
                    </InputLabel>
                    <Select
                        onMouseDown={() => setMaterialError(false)}
                        sx={{
                            width: '200px',
                        }}
                        error={materialError}
                        onChange={(event) =>
                            setMaterialName(event.target.value)
                        }
                        defaultValue={''}
                        variant="filled"
                        color="secondary"
                    >
                        {availableMaterials.map(({ name }) => (
                            <MenuItem key={name} value={name}>
                                {name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField color="secondary" label="description" />
            </Box>

            <Button onClick={onClick}>SUBMIT</Button>
        </>
    );
};

export default AddMaterialFields;
