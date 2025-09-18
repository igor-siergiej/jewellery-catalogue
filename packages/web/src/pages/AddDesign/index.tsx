import { useAuth, useUser } from '@igor-siergiej/web-utils';
import { FormDesign } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import makeAddDesignRequest from '../../api/endpoints/addDesign';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import { AddMaterialsTable } from '../../components/AddMaterialsTable';
import ImageUpload from '../../components/ImageUpload';
import TimeInput from '../../components/TimeInput';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { getTotalMaterialCosts } from '../../utils/getPriceOfMaterials';
import { getWageCosts } from '../../utils/getWageCost';

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
    }, [selectedMaterials, currentTimeRequired, data, setValue]);

    if (!data) {
        return null;
    }

    return (
        <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <h1 className="text-2xl font-semibold text-left pl-2 leading-[50px]">
                        Adding New Design
                    </h1>
                    <hr className="border-t border-border" />
                </div>

                {/* Design Details Section */}
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                        <h2 className="text-lg font-medium text-center pt-1.5">
                            Design Details
                        </h2>
                    </div>
                    <div className="col-span-8">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    {...register('name', {
                                        required: {
                                            value: true,
                                            message: 'Please enter the design name.',
                                        },
                                    })}
                                    className={errors.name ? 'border-red-500' : ''}
                                    placeholder="Enter design name"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                                )}
                            </div>
                            <div className="flex-1">
                                <TimeInput setValue={setValue} />
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-t border-border" />

                {/* Upload Image Section */}
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                        <h2 className="text-lg font-medium text-center h-[30px] leading-[30px]">
                            Upload Image
                        </h2>
                    </div>
                    <div className="col-span-8">
                        <ImageUpload setImage={setValue} />
                    </div>
                </div>

                <hr className="border-t border-border" />

                {/* Add Materials Section */}
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                        <h2 className="text-lg font-medium text-center">
                            Add Materials
                        </h2>
                    </div>
                    <div className="col-span-8">
                        <AddMaterialsTable availableMaterials={data} setValue={setValue} />
                    </div>
                </div>

                <hr className="border-t border-border" />

                {/* Set Price Section */}
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                        <h2 className="text-lg font-medium text-center">
                            Set Price
                        </h2>
                    </div>
                    <div className="col-span-8">
                        <div className="w-[300px]">
                            <Label htmlFor="price">Price</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">£</span>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    {...register('price', {
                                        required: {
                                            value: true,
                                            message: 'Please enter the desired price.',
                                        },
                                    })}
                                    className={`pl-8 ${errors.price ? 'border-red-500' : ''}`}
                                    placeholder="0.00"
                                />
                            </div>
                            {errors.price && (
                                <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                <hr className="border-t border-border" />

                {/* Add Description Section */}
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                        <h2 className="text-lg font-medium text-center">
                            Add Description
                        </h2>
                    </div>
                    <div className="col-span-8">
                        {/* TODO: Add description editor here */}
                    </div>
                </div>

                <hr className="border-t border-border" />

                {/* Submit Button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isMakingRequest}
                        className="min-w-[140px]"
                    >
                        {isMakingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Design
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export default AddDesign;
