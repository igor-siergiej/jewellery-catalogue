import Typography from '@mui/material/Typography';
import { SubmitHandler, useForm } from 'react-hook-form';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useQuery } from '@tanstack/react-query';
import AddMaterialsForm from '../../components/AddMaterialsForm';
import TimeInput from '../../components/TimeInput';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import makeAddDesignRequest from '../../api/endpoints/addDesign';
import { FormDesign } from '@jewellery-catalogue/types';
import { getTotalMaterialCosts } from '../../util/getPriceOfMaterials';
import { Box, Card, Grid2 } from '@mui/material';
import ImageUpload from '../../components/ImageUploadButton';

const AddDesign = () => {
    const {
        setValue,
        handleSubmit,
        register,
        watch,
        formState: { errors },
    } = useForm<FormDesign>();
    const { data } = useQuery({
        ...getMaterialsQuery(),
    });

    const onSubmit: SubmitHandler<FormDesign> = (data) => {
        makeAddDesignRequest(data);
    };

    const selectedMaterials = watch('materials');

    console.log(watch('image'));

    if (!data) {
        return null;
    }

    return (
        <Card sx={{ padding: 2 }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid2 gap={4} container direction="column">
                    <Grid2>
                        <Typography
                            variant="h5"
                            sx={{ paddingLeft: 2, lineHeight: '50px' }}
                            noWrap
                            component="div"
                        >
                            Adding New Design
                        </Typography>
                    </Grid2>

                    <Grid2 container direction="row">
                        <Grid2 size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                                sx={{ paddingTop: 1.5 }}
                            >
                                Design Details
                            </Typography>
                        </Grid2>

                        <Grid2 size={8}>
                            <Grid2 gap={2} container direction="column">
                                <TextField
                                    {...register('name', {
                                        required: {
                                            value: true,
                                            message: 'Please enter the design name.',
                                        },
                                    })}
                                    sx={{ width: '100%' }}
                                    color="secondary"
                                    label="Name"
                                    error={Boolean(errors.name)}
                                    helperText={errors.name?.message}
                                />

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        {...register('price', {
                                            required: {
                                                value: true,
                                                message: 'Please enter the desired price.',
                                            },
                                        })}
                                        sx={{ width: '50%' }}
                                        color="secondary"
                                        label="Price"
                                        error={Boolean(errors.price)}
                                        helperText={errors.price?.message}
                                    />

                                    <Box sx={{ width: '50%', display: 'flex' }}>
                                        <TimeInput setValue={setValue} />
                                    </Box>
                                </Box>
                            </Grid2>
                        </Grid2>
                    </Grid2>

                    <Grid2 container direction="row">
                        <Grid2 size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                                height={30}
                            >
                                Upload Image
                            </Typography>
                        </Grid2>

                        <Grid2 size={8}>
                            <ImageUpload setImage={setValue} />
                        </Grid2>
                    </Grid2>

                    <Grid2 container direction="row">
                        <Grid2 size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                            >
                                Add Materials
                            </Typography>
                        </Grid2>

                        <Grid2 size={8}>
                            <Typography
                                variant="subtitle2"
                            >
                                Current total material costs:
                                {' '}
                                {selectedMaterials && getTotalMaterialCosts(selectedMaterials)}
                            </Typography>

                            <AddMaterialsForm availableMaterials={data} setValue={setValue} />

                        </Grid2>
                    </Grid2>

                    <Grid2 container justifyContent="end">
                        <Button variant="contained" color="secondary" type="submit">
                            Add Design!
                        </Button>
                    </Grid2>
                </Grid2>
            </form>
        </Card>
    );
};

export default AddDesign;
