import Typography from '@mui/material/Typography';
import { SubmitHandler, useForm } from 'react-hook-form';
import TextField from '@mui/material/TextField';
import { IFormDesign } from './types';
import Button from '@mui/material/Button';

const URL_REGEX =
    /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/g;
const DECIMAL_REGEX = /^\d*(\.\d+)?$/;
const NUMBER_REGEX = /^[0-9]*$/;

const AddDesign = () => {
    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<IFormDesign>();

    const onSubmit: SubmitHandler<IFormDesign> = (data) => {
        // TODO: Add api to make a request
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
                    {...register('name', {
                        required: {
                            value: true,
                            message: 'Please enter the material name.',
                        },
                    })}
                    color="secondary"
                    label="Name"
                    error={Boolean(errors.name)}
                    helperText={errors.name?.message}
                />

                <Button variant="contained" color="secondary" type="submit">
                    Add Design!
                </Button>
            </form>
        </>
    );
};

export default AddDesign;
