import { SubmitHandler, useForm } from 'react-hook-form';
import { TextField, Typography } from '@mui/material';
import MaterialFormResolver from '../../components/MaterialFormResolver';
import DropDown from '../../components/DropDown';
import { FormMaterial, MaterialType } from '@jewellery-catalogue/types';
import { useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import makeAddMaterialRequest from '../../api/endpoints/addMaterial';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const URL_REGEX
    = /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/g;
const DECIMAL_REGEX = /^\d*(\.\d+)?$/;
const NUMBER_REGEX = /^[0-9]*$/;

const AddMaterial = () => {
    const {
        control,
        handleSubmit,
        register,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormMaterial>();
    const [isMakingRequest, setIsMakingRequest] = useState(false);

    const { dispatch } = useAlert();

    const currentMaterialType = watch('type');

    const onSubmit: SubmitHandler<FormMaterial> = async (data) => {
        setIsMakingRequest(true);
        try {
            await makeAddMaterialRequest(data);

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
                    {...register('diameter', {
                        valueAsNumber: true,
                        required: {
                            value: true,
                            message: 'Please enter the diameter.',
                        },
                        validate: value => value > 0,
                    })}
                    color="secondary"
                    label="Diameter (mm)"
                    error={Boolean(errors.diameter)}
                    helperText={errors.diameter?.message}
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
                        pattern: {
                            value: DECIMAL_REGEX,
                            message: 'Please enter a valid price',
                        },
                    })}
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
                        pattern: {
                            value: NUMBER_REGEX,
                            message: 'Please enter a valid quantity of packs',
                        },
                    })}
                    color="secondary"
                    label="Number of new packs"
                    error={Boolean(errors.packs)}
                    helperText={errors.packs?.message}
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

                <LoadingButton
                    variant="contained"
                    color="secondary"
                    type="submit"
                    loading={isMakingRequest}
                >
                    Add Material!
                </LoadingButton>
            </form>
        </>
    );
};

export default AddMaterial;
