import Typography from '@mui/material/Typography';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import TimeInput from '../../components/TimeInput';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import makeAddDesignRequest from '../../api/endpoints/addDesign';
import { FormDesign } from '@jewellery-catalogue/types';
import { getTotalMaterialCosts } from '../../util/getPriceOfMaterials';
import { Box, Card, Divider, Grid2, InputAdornment } from '@mui/material';
import ImageUpload from '../../components/ImageUpload';
import { AddMaterialsTable } from '../../components/AddMaterialsTable';
import TextEditor from '../../components/Editor';
import { useEffect, useState } from 'react';
import { getWageCosts } from '../../util/getWageCost';
import LoadingButton from '@mui/lab/LoadingButton';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const PROFIT_COEFFICIENT = 1.15;
const HOURLY_WAGE = 10;

const AddDesign: React.FC = () => {
    const {
        setValue,
        handleSubmit,
        register,
        watch,
        control,
        reset,
        formState: { errors },
    } = useForm<FormDesign>();

    const [isMakingRequest, setIsMakingRequest] = useState(false);

    const { data } = useQuery({
        ...getMaterialsQuery(),
    });

    const selectedMaterials = watch('materials');
    const currentTimeRequired = watch('timeRequired');

    const { dispatch } = useAlert();

    const onSubmit: SubmitHandler<FormDesign> = async (data) => {
        setIsMakingRequest(true);
        try {
            await makeAddDesignRequest(data);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Yahoooo!',
                    message: 'Added design successfully!',
                    severity: 'success',
                    variant: 'standard'
                }
            });
            reset();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during the adding of the design! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard'
                }
            });
        } finally {
            setIsMakingRequest(false);
        }
    };

    useEffect(() => {
        if (data && selectedMaterials) {
            const materialsCost = getTotalMaterialCosts(selectedMaterials, data);
            const timeSpentCost = parseFloat((getWageCosts(currentTimeRequired) * HOURLY_WAGE).toFixed(2));
            const totalCosts = materialsCost + timeSpentCost;
            setValue('price', parseFloat((totalCosts * PROFIT_COEFFICIENT).toFixed(2)));
        }
    }, [selectedMaterials]);

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

                        <Divider variant="fullWidth" />
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
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        {...register('name', {
                                            required: {
                                                value: true,
                                                message: 'Please enter the design name.',
                                            },
                                        })}
                                        sx={{ width: '50%' }}
                                        color="secondary"
                                        label="Name"
                                        error={Boolean(errors.name)}
                                        helperText={errors.name?.message}
                                    />
                                    <Box sx={{ width: '50%', display: 'flex' }}>
                                        <TimeInput setValue={setValue} />
                                    </Box>
                                </Box>
                            </Grid2>
                        </Grid2>
                    </Grid2>

                    <Divider variant="fullWidth" />

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

                    <Divider variant="fullWidth" />

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
                            <AddMaterialsTable availableMaterials={data} setValue={setValue} />
                        </Grid2>
                    </Grid2>

                    <Divider variant="fullWidth" />

                    <Grid2 container direction="row">
                        <Grid2 size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                            >
                                Set Price
                            </Typography>
                        </Grid2>

                        <Grid2 size={8}>
                            <TextField
                                {...register('price', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the desired price.',
                                    },
                                })}
                                sx={{ width: 300 }}
                                color="secondary"
                                label="Price"
                                error={Boolean(errors.price)}
                                helperText={errors.price?.message}
                                slotProps={{
                                    input: {
                                        startAdornment: <InputAdornment position="start">£</InputAdornment>
                                    }
                                }}
                            />
                        </Grid2>
                    </Grid2>

                    <Divider variant="fullWidth" />

                    <Grid2 container direction="row">
                        <Grid2 size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                            >
                                Add Description
                            </Typography>
                        </Grid2>

                        <Grid2 size={8}>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <TextEditor value={field.value} onChange={field.onChange} />
                                )}
                            />
                        </Grid2>
                    </Grid2>

                    <Divider variant="fullWidth" />

                    <Grid2 container justifyContent="end">
                        <LoadingButton
                            variant="contained"
                            color="secondary"
                            type="submit"
                            loading={isMakingRequest}
                        >
                            Add Material!
                        </LoadingButton>
                    </Grid2>
                </Grid2>
            </form>
        </Card>
    );
};

export default AddDesign;
