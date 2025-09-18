import { useAuth, useUser } from '@igor-siergiej/web-utils';
import { FormMaterial, MaterialType } from '@jewellery-catalogue/types';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import makeAddMaterialRequest from '../../api/endpoints/addMaterial';
import DropDown from '../../components/DropDown';
import MaterialFormResolver from '../../components/MaterialFormResolver';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

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
        <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold pl-2 leading-[50px] truncate">
                        Adding New Material
                    </h1>
                    <div className="border-b border-border mt-2" />
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/4">
                        <h2 className="text-center text-xl font-semibold pt-1.5">
                            Material Details
                        </h2>
                    </div>

                    <div className="lg:w-3/4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                {...register('name', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the material name.',
                                    },
                                })}
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="brand">Brand</Label>
                            <Input
                                id="brand"
                                {...register('brand', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the brand name.',
                                    },
                                })}
                                className={errors.brand ? 'border-red-500' : ''}
                            />
                            {errors.brand && (
                                <p className="text-sm text-red-500">{errors.brand.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchaseUrl">URL</Label>
                            <Input
                                id="purchaseUrl"
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
                                className={errors.purchaseUrl ? 'border-red-500' : ''}
                            />
                            {errors.purchaseUrl && (
                                <p className="text-sm text-red-500">{errors.purchaseUrl.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pricePerPack">Price per Pack (£)</Label>
                            <Input
                                id="pricePerPack"
                                type="number"
                                step="0.01"
                                {...register('pricePerPack', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the price.',
                                    },
                                    setValueAs: value => value === '' ? undefined : Number(value),
                                })}
                                className={errors.pricePerPack ? 'border-red-500' : ''}
                            />
                            {errors.pricePerPack && (
                                <p className="text-sm text-red-500">{errors.pricePerPack.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="packs">Number of new packs</Label>
                            <Input
                                id="packs"
                                type="number"
                                step="1"
                                {...register('packs', {
                                    required: {
                                        value: true,
                                        message: 'Please enter the quantity of packs.',
                                    },
                                    setValueAs: value => value === '' ? undefined : Number(value),
                                })}
                                className={errors.packs ? 'border-red-500' : ''}
                            />
                            {errors.packs && (
                                <p className="text-sm text-red-500">{errors.packs.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-b border-border" />

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/4">
                        <h2 className="text-center text-xl font-semibold h-[30px]">
                            Material Type
                        </h2>
                    </div>

                    <div className="lg:w-3/4 space-y-4">
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
                    </div>
                </div>

                <div className="border-b border-border" />

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        variant="secondary"
                        disabled={isMakingRequest}
                        className="min-w-32"
                    >
                        {isMakingRequest && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Material!
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export default AddMaterial;
