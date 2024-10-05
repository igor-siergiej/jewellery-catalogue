import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { BaseMaterialType, Material, MaterialType } from '../Materials/types';
import {
    Button,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';

type AddMaterialInputs = BaseMaterialType;

const AddMaterial = () => {
    const { control, handleSubmit, register, watch } = useForm<Material>();

    const currentMaterialType = watch('type');
    const onSubmit: SubmitHandler<AddMaterialInputs> = (data) => {
        console.log(data);
    };

    const materialTypeFormResolver = () => {
        switch (currentMaterialType) {
            case MaterialType.WIRE:
                return 'WIRE';
            case MaterialType.BEAD:
                return 'BEAD';
            default:
                return null;
        }
    };

    return (
        <>
            <Typography
                variant="h5"
                sx={{ lineHeight: '50px', paddingBottom: 2 }}
                noWrap
                component="div"
            >
                Enter material details:
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                    {...register('name')}
                    color="secondary"
                    label="Name"
                />
                <TextField
                    {...register('brand')}
                    color="secondary"
                    label="Brand"
                />
                <TextField
                    {...register('diameter')}
                    color="secondary"
                    label="Diameter (mm)"
                />

                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <>
                            <InputLabel id="typeLabel">
                                Material Type
                            </InputLabel>
                            <Select
                                labelId="typeLabel"
                                sx={{
                                    lineHeight: '1.4em',
                                    width: '250px',
                                    '.MuiSelect-select': { paddingTop: 1.5 },
                                }}
                                defaultValue={''}
                                variant="filled"
                                color="secondary"
                                label="Material Type"
                                {...field}
                            >
                                {(
                                    Object.keys(
                                        MaterialType
                                    ) as Array<MaterialType>
                                ).map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </Select>
                        </>
                    )}
                />

                {materialTypeFormResolver()}

                <Button variant="contained" color="secondary" type="submit">
                    Add Material!
                </Button>
            </form>
        </>
    );
};

export default AddMaterial;
