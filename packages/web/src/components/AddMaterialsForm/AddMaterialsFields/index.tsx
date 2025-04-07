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
import { FormDesign, Material } from '@jewellery-catalogue/types';

const DECIMAL_REGEX = /^\d*(\.\d+)?$/;

interface IAddMaterialFieldsProps {
    availableMaterials: Array<Material>;
    setCurrentMaterials: (materials: Array<Material>) => void;
    currentMaterials: Array<Material>;
    setValue: UseFormSetValue<FormDesign>;
}

// TODO: I hate this so much
// please use form hook and make this a form please
// don't ignore this and stick to this crap
// plug in the rest of this crap

interface ISelectMaterial {
    materialName: string;
    amount: number;
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

        const returnMaterial = { ...material, amount: data.amount };

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
                    {...register('amount', {
                        required: {
                            value: true,
                            message: 'Please enter the quantity/length.',
                        },
                        pattern: {
                            value: DECIMAL_REGEX,
                            message: 'Please enter a valid quantity/length',
                        },
                    })}
                    sx={{ width: '230px' }}
                    error={Boolean(errors.amount)}
                    helperText={errors.amount?.message}
                    color="secondary"
                    label="Quantity/Length used (cm)"
                />
            </Box>

            <Button type="submit">ADD MATERIAL TO DESIGN</Button>
        </form>
    );
};

export default AddMaterialFields;
