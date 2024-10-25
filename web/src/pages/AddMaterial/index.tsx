import { SubmitHandler, useForm } from 'react-hook-form';
import { BaseMaterialType, Material, MaterialType } from '../Materials/types';
import { Button, TextField, Typography } from '@mui/material';
import MaterialTypeDropDown from './MaterialTypeDropDown';

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

                <MaterialTypeDropDown control={control} />

                {materialTypeFormResolver()}

                <Button variant="contained" color="secondary" type="submit">
                    Add Material!
                </Button>
            </form>
        </>
    );
};

export default AddMaterial;
