import Typography from '@mui/material/Typography';
import { SubmitHandler, useForm } from 'react-hook-form';
import TextField from '@mui/material/TextField';
import { IFormDesign } from './types';
import Button from '@mui/material/Button';
import { getMaterialsQuery } from '../../api/getMaterials';
import { useQuery } from '@tanstack/react-query';
import AddMaterialsForm from '../../components/AddMaterialsForm';
import TimeInput from '../../components/TimeInput';

const DECIMAL_REGEX = /^\d*(\.\d+)?$/;

const AddDesign = () => {
    const {
        setValue,
        handleSubmit,
        register,
        control,
        formState: { errors },
    } = useForm<IFormDesign>();

    const { data } = useQuery({
        ...getMaterialsQuery(),
    });

    const onSubmit: SubmitHandler<IFormDesign> = (data) => {
        // TODO: Add api to make a request
        console.log(data);
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

                <AddMaterialsForm
                    availableMaterials={data}
                    register={register}
                    setValue={setValue}
                    control={control}
                />

                <Button variant="contained" color="secondary" type="submit">
                    Add Design!
                </Button>
            </form>
        </>
    );
};

export default AddDesign;
