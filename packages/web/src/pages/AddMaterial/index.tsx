import { FormMaterial, MaterialType } from '@jewellery-catalogue/types';
import LoadingButton from '@mui/lab/LoadingButton';
import { Card, Divider, Grid, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

import makeAddMaterialRequest from '../../api/endpoints/addMaterial';
import DropDown from '../../components/DropDown';
import MaterialFormResolver from '../../components/MaterialFormResolver';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';

const URL_REGEX
    = /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/g;

const AddMaterial = () => {
    const {
        control,
        handleSubmit,
        register,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormMaterial>({
        defaultValues: {
            name: '',
            brand: '',
            diameter: undefined,
            purchaseUrl: '',
            pricePerPack: undefined,
            packs: undefined,
            type: undefined,
            wireType: undefined,
            metalType: undefined,
            length: undefined,
            colour: '',
            quantity: undefined
        }
    });
    const [isMakingRequest, setIsMakingRequest] = useState(false);
    const { accessToken, login, logout } = useAuth();
    const { user } = useUser();

    const { dispatch } = useAlert();

    const currentMaterialType = watch('type');

    const onSubmit: SubmitHandler<FormMaterial> = async (data) => {
        setIsMakingRequest(true);
        try {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }
            await makeAddMaterialRequest(user.id, data, accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Yahoooo!',
                    message: 'Added material successfully!',
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
                    title: 'Error occured during adding material! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard'
                }
            });
        } finally {
            setIsMakingRequest(false);
        }
    };

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
                            Adding New Material
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
                                Material Details
                            </Typography>
                        </Grid>

                        <Grid size={8}>
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
                            <TextField
                                {...register('brand', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the brand name.',
                                    },
                                })}
                                color="secondary"
                                label="Brand"
                                error={Boolean(errors.brand)}
                                helperText={errors.brand?.message}
                            />
                            <TextField
                                {...register('purchaseUrl', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the URL',
                                    },
                                    pattern: {
                                        value: URL_REGEX,
                                        message: 'Please enter a valid URL',
                                    },
                                })}
                                color="secondary"
                                label="URL"
                                error={Boolean(errors.purchaseUrl)}
                                helperText={errors.purchaseUrl?.message}
                            />
                            <TextField
                                {...register('pricePerPack', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the price.',
                                    },
                                    setValueAs: value => value === '' ? undefined : Number(value),
                                })}
                                type="number"
                                inputProps={{ step: '0.01' }}
                                color="secondary"
                                label="Price per Pack (£)"
                                error={Boolean(errors.pricePerPack)}
                                helperText={errors.pricePerPack?.message}
                            />

                            <TextField
                                {...register('packs', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the quantity of packs.',
                                    },
                                    setValueAs: value => value === '' ? undefined : Number(value),
                                })}
                                type="number"
                                inputProps={{ step: '1' }}
                                color="secondary"
                                label="Number of new packs"
                                error={Boolean(errors.packs)}
                                helperText={errors.packs?.message}
                            />

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
                                Material Type
                            </Typography>
                        </Grid>

                        <Grid size={8}>
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
                        </Grid>
                    </Grid>

                    <Divider variant="fullWidth" />

                    <Grid container justifyContent="end">
                        <LoadingButton
                            variant="contained"
                            color="secondary"
                            type="submit"
                            loading={isMakingRequest}
                        >
                            Add Material!
                        </LoadingButton>
                    </Grid>
                </Grid>
            </form>
        </Card>
    );
};

export default AddMaterial;
