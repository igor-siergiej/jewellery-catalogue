import Typography from '@mui/material/Typography';
import { SubmitHandler, useForm } from 'react-hook-form';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useQuery } from '@tanstack/react-query';
import AddMaterialsForm from '../../components/AddMaterialsForm';
import TimeInput from '../../components/TimeInput';
import ImageUploadButton from '../../components/ImageUploadButton';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import makeAddDesignRequest from '../../api/endpoints/addDesign';
import { FormDesign } from '@jewellery-catalogue/types';

const AddDesign = () => {
    const {
        setValue,
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<FormDesign>();

    const { data } = useQuery({
        ...getMaterialsQuery(),
    });

    const onSubmit: SubmitHandler<FormDesign> = (data) => {
        makeAddDesignRequest(data)
    };

    if (!data) {
        return null;
    }

    return (
        <>
            <Typography
                variant="h5"
                sx={{ lineHeight: '50px', paddingBottom: 2 }}
                noWrap
                component="div"
            >
                Enter Design Details:
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                    {...register('name', {
                        required: {
                            value: true,
                            message: 'Please enter the design name.',
                        },
                    })}
                    color="secondary"
                    label="Name"
                    error={Boolean(errors.name)}
                    helperText={errors.name?.message}
                />
                <TextField
                    {...register('description')}
                    color="secondary"
                    label="description"
                />

                <TimeInput setValue={setValue} />


                <ImageUploadButton register={register} />

                <Button variant="contained" color="secondary" type="submit">
                    Add Design!
                </Button>
            </form>


            <AddMaterialsForm availableMaterials={data} setValue={setValue} />

            {/* This should be in like a bottom panel stuck to the bottom of the screen */}
        </>
    );
};

export default AddDesign;
