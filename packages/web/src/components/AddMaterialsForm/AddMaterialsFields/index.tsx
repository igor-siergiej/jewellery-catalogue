import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';
import {
    Controller,
    SubmitHandler,
    useForm,
    UseFormSetValue,
} from 'react-hook-form';
import { Material } from 'types';
import { IFormDesign } from '../../../pages/AddDesign/types';

const DECIMAL_REGEX = /^\d*(\.\d+)?$/;

interface IAddMaterialFieldsProps {
    availableMaterials: Array<Material>;
    setCurrentMaterials: (materials: Array<Material>) => void;
    currentMaterials: Array<Material>;
    setValue: UseFormSetValue<IFormDesign>;
}

// TODO: I hate this so much
// please use form hook and make this a form please
// don't ignore this and stick to this crap
// plug in the rest of this crap

interface ISelectMaterial {
    materialName: string;
    quantity: number;
}

const AddMaterialFields: React.FC<IAddMaterialFieldsProps> = ({
    availableMaterials,
    setCurrentMaterials,
    currentMaterials,
    setValue,
}) => {
    const {
        control,
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<ISelectMaterial>();

    const onSubmit: SubmitHandler<ISelectMaterial> = async (data) => {
        const material = availableMaterials.find(
            searchMaterial => searchMaterial.name === data.materialName
        );

        if (!material) {
            return;
        }

        const returnMaterial = { ...material, quantity: data.quantity };

        const materials = [...currentMaterials, returnMaterial];

        setCurrentMaterials(materials);
        setValue('materials', materials);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box
                sx={{
                    marginTop: 2,
                    marginBottom: 2,
                }}
            >
                <Controller
                    name="materialName"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                        <FormControl variant="filled" fullWidth>
                            <InputLabel>Select Material</InputLabel>
                            <Select
                                labelId="materialName"
                                sx={{
                                    width: '200px',
                                }}
                                error={Boolean(errors.materialName)}
                                defaultValue=""
                                required
                                variant="filled"
                                color="secondary"
                                {...field}
                            >
                                {availableMaterials.map(({ name }) => (
                                    <MenuItem key={name} value={name}>
                                        {name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                />

                <TextField
                    {...register('quantity', {
                        required: {
                            value: true,
                            message: 'Please enter the quantity/length.',
                        },
                        pattern: {
                            value: DECIMAL_REGEX,
                            message: 'Please enter a valid quantity/length',
                        },
                    })}
                    error={Boolean(errors.quantity)}
                    helperText={errors.quantity?.message}
                    color="secondary"
                    label="Quantity/Length used"
                />
            </Box>

            <Button type="submit">ADD MATERIAL TO DESIGN</Button>
        </form>
    );
};

export default AddMaterialFields;
