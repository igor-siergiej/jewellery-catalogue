import { SubmitHandler, useForm } from 'react-hook-form';
import { BaseMaterialType } from '../Materials/types';
import { Button, TextField } from '@mui/material';

type AddMaterialInputs = BaseMaterialType;

const AddMaterial = () => {
    const { handleSubmit, register } = useForm<AddMaterialInputs>();

    const onSubmit: SubmitHandler<AddMaterialInputs> = (data) => {
        console.log(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <TextField {...register('name')} color="secondary" label="Name" />
            <TextField {...register('brand')} color="secondary" label="Brand" />
            <Button variant="contained" color="secondary" type="submit">
                Add Material!
            </Button>
        </form>
    );
};

export default AddMaterial;
