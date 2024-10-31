import { SubmitHandler, useForm } from 'react-hook-form';
import { BaseMaterialType, Material, MaterialType } from '../Materials/types';
import { Button, TextField, Typography } from '@mui/material';
import MaterialFormResolver from '../../components/MaterialFormResolver';
import DropDown from '../../components/DropDown';

type AddMaterialInputs = BaseMaterialType;

const AddMaterial = () => {
    const { control, handleSubmit, register, watch } = useForm<Material>();

    const currentMaterialType = watch('type');

    const onSubmit: SubmitHandler<AddMaterialInputs> = (data) => {
        console.log(data);
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
                <TextField
                    {...register('purchaseUrl')}
                    color="secondary"
                    label="URL"
                />
                <TextField
                    {...register('pricePerPack')}
                    color="secondary"
                    label={`Price per Pack (£)`}
                />

                <DropDown
                    label="Material Type"
                    name="type"
                    control={control}
                    options={Object.keys(MaterialType) as Array<MaterialType>}
                />
                <MaterialFormResolver
                    control={control}
                    materialType={currentMaterialType}
                    register={register}
                />
                <Button variant="contained" color="secondary" type="submit">
                    Add Material!
                </Button>
            </form>
        </>
    );
};

export default AddMaterial;
