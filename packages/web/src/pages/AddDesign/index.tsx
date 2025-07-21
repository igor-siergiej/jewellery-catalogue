import Typography from '@mui/material/Typography';
import { SubmitHandler, useForm } from 'react-hook-form';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import TimeInput from '../../components/TimeInput';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import makeAddDesignRequest from '../../api/endpoints/addDesign';
import { FormDesign } from '@jewellery-catalogue/types';
import { getTotalMaterialCosts } from '../../utils/getPriceOfMaterials';
import { Box, Card, Divider, Grid, InputAdornment } from '@mui/material';
import ImageUpload from '../../components/ImageUpload';
import { AddMaterialsTable } from '../../components/AddMaterialsTable';
// import TextEditor from '../../components/Editor';
import { useEffect, useState } from 'react';
import { getWageCosts } from '../../utils/getWageCost';
import LoadingButton from '@mui/lab/LoadingButton';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';

const PROFIT_COEFFICIENT = 1.15;
const HOURLY_WAGE = 10;

const AddDesign: React.FC = () => {
    const {
        setValue,
        handleSubmit,
        register,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormDesign>();
    const { accessToken, login, logout } = useAuth();
    const { user } = useUser();
    const [isMakingRequest, setIsMakingRequest] = useState(false);

    const { data } = useQuery({
        ...getMaterialsQuery(user?.id || '', accessToken, login, logout),
        enabled: !!user?.id && !!accessToken,
    });

    const selectedMaterials = watch('materials');
    const currentTimeRequired = watch('timeRequired');

    const { dispatch } = useAlert();

    const onSubmit: SubmitHandler<FormDesign> = async (data) => {
        setIsMakingRequest(true);
        try {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }
            await makeAddDesignRequest(user.id, data, accessToken, login, logout);

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
                <Grid gap={4} container direction="column">
                    <Grid>
                        <Typography
                            variant="h5"
                            sx={{ paddingLeft: 2, lineHeight: '50px' }}
                            noWrap
                            component="div"
                        >
                            Adding New Design
                        </Typography>

                        <Divider variant="fullWidth" />
                    </Grid>

                    <Grid container direction="row">
                        <Grid size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                                sx={{ paddingTop: 1.5 }}
                            >
                                Design Details
                            </Typography>
                        </Grid>

                        <Grid size={8}>
                            <Grid gap={2} container direction="column">
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
                            </Grid>
                        </Grid>
                    </Grid>

                    <Divider variant="fullWidth" />

                    <Grid container direction="row">
                        <Grid size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                                height={30}
                            >
                                Upload Image
                            </Typography>
                        </Grid>

                        <Grid size={8}>
                            <ImageUpload setImage={setValue} />
                        </Grid>
                    </Grid>

                    <Divider variant="fullWidth" />

                    <Grid container direction="row">
                        <Grid size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                            >
                                Add Materials
                            </Typography>
                        </Grid>

                        <Grid size={8}>
                            <AddMaterialsTable availableMaterials={data} setValue={setValue} />
                        </Grid>
                    </Grid>

                    <Divider variant="fullWidth" />

                    <Grid container direction="row">
                        <Grid size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                            >
                                Set Price
                            </Typography>
                        </Grid>

                        <Grid size={8}>
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
                        </Grid>
                    </Grid>

                    <Divider variant="fullWidth" />

                    <Grid container direction="row">
                        <Grid size={4}>
                            <Typography
                                align="center"
                                variant="h6"
                            >
                                Add Description
                            </Typography>
                        </Grid>

                        {/* <Grid size={8}>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <TextEditor value={field.value} onChange={field.onChange} />
                                )}
                            />
                        </Grid> */}
                    </Grid>

                    <Divider variant="fullWidth" />

                    <Grid container justifyContent="end">
                        <LoadingButton
                            variant="contained"
                            color="secondary"
                            type="submit"
                            loading={isMakingRequest}
                        >
                            Create Design
                        </LoadingButton>
                    </Grid>
                </Grid>
            </form>
        </Card>
    );
};

export default AddDesign;
