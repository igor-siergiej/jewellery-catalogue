import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { type FormDesign, formDesignSchema } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

import makeAddDesignRequest from '../../api/endpoints/addDesign';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import { AddMaterialsTable } from '../../components/AddMaterialsTable';
import ImageUpload from '../../components/ImageUpload';
import RichTextEditor from '../../components/RichTextEditor';
import TimeInput from '../../components/TimeInput';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { getTotalMaterialCosts } from '../../utils/getPriceOfMaterials';
import { getWageCosts } from '../../utils/getWageCost';

const PROFIT_COEFFICIENT = 1.15;
const HOURLY_WAGE = 10;

const AddDesign: React.FC = () => {
    const form = useForm({
        resolver: zodResolver(formDesignSchema),
        mode: 'onSubmit',
        defaultValues: {
            name: '',
            timeRequired: '',
            materials: [],
            description: '',
            totalMaterialCosts: 0,
            image: undefined,
            lowStockThreshold: undefined,
        },
    });

    const { accessToken, login, logout } = useAuth();
    const [isMakingRequest, setIsMakingRequest] = useState(false);

    const { data } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const selectedMaterials = form.watch('materials');
    const currentTimeRequired = form.watch('timeRequired');

    const { dispatch } = useAlert();

    const onSubmit: SubmitHandler<FormDesign> = async (data) => {
        setIsMakingRequest(true);
        try {
            await makeAddDesignRequest(data, () => accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Yahoooo!',
                    message: 'Added design successfully!',
                    severity: 'success',
                    variant: 'standard',
                },
            });
            form.reset();
        } catch (e) {
            console.error('[AddDesign] Error adding design:', e);
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during the adding of the design! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsMakingRequest(false);
        }
    };

    useEffect(() => {
        if (!data) return;

        const materialsCost = selectedMaterials.length > 0 ? getTotalMaterialCosts(selectedMaterials) : 0;

        const timeSpentCost = parseFloat((getWageCosts(currentTimeRequired) * HOURLY_WAGE).toFixed(2));

        const totalCosts = materialsCost + timeSpentCost;
        const finalPrice = parseFloat((totalCosts * PROFIT_COEFFICIENT).toFixed(2));

        form.setValue('totalMaterialCosts', materialsCost);
        form.setValue('price', finalPrice);
    }, [selectedMaterials, currentTimeRequired, data, form.setValue]);

    if (!data) {
        return null;
    }

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
        }
    };

    return (
        <Card className="p-6 max-w-5xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleFormKeyDown} className="space-y-8">
                    {/* Header */}
                    <div className="space-y-4">
                        <h1 className="text-2xl font-semibold text-left pl-2 leading-[50px]">Adding New Design</h1>
                        <hr className="border-t border-border" />
                    </div>

                    {/* Design Details Section */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4">
                            <h2 className="text-lg font-medium text-center pt-1.5">Design Details</h2>
                        </div>
                        <div className="col-span-8">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter design name"
                                                        className="max-w-[300px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="flex-1">
                                    <TimeInput form={form} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-t border-border" />

                    {/* Upload Image Section */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4">
                            <h2 className="text-lg font-medium text-center h-[30px] leading-[30px]">Upload Image</h2>
                        </div>
                        <div className="col-span-8">
                            <FormField
                                control={form.control}
                                name="image"
                                render={({ field, fieldState }) => (
                                    <FormItem>
                                        <FormControl>
                                            <ImageUpload
                                                setImage={form.setValue}
                                                hasError={!!fieldState.error}
                                                value={field.value}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <hr className="border-t border-border" />

                    {/* Add Materials Section */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4">
                            <h2 className="text-lg font-medium text-center">Add Materials</h2>
                        </div>
                        <div className="col-span-8">
                            <FormField
                                control={form.control}
                                name="materials"
                                render={({ field, fieldState }) => (
                                    <FormItem>
                                        <FormControl>
                                            <AddMaterialsTable
                                                availableMaterials={data}
                                                setValue={form.setValue}
                                                hasError={!!fieldState.error}
                                                value={field.value}
                                            />
                                        </FormControl>
                                        {fieldState.error && (
                                            <p className="text-sm font-medium text-destructive mt-2">
                                                {fieldState.error.message || JSON.stringify(fieldState.error, null, 2)}
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <hr className="border-t border-border" />

                    {/* Set Price Section */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4">
                            <h2 className="text-lg font-medium text-center">Set Price</h2>
                        </div>
                        <div className="col-span-8">
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price</FormLabel>
                                        <FormControl>
                                            <InputGroup className="max-w-[180px]">
                                                <InputGroupAddon align="inline-start">
                                                    <InputGroupText>£</InputGroupText>
                                                </InputGroupAddon>
                                                <InputGroupInput
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;

                                                        field.onChange(value === '' ? undefined : Number(value));
                                                    }}
                                                />
                                            </InputGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <hr className="border-t border-border" />

                    {/* Add Description Section */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4">
                            <h2 className="text-lg font-medium text-center">Add Description</h2>
                        </div>
                        <div className="col-span-8">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <RichTextEditor
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                placeholder="Add notes about how to create this design..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <hr className="border-t border-border" />

                    {/* Low Stock Threshold Section */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4">
                            <h2 className="text-lg font-medium text-center">Stock Alert</h2>
                        </div>
                        <div className="col-span-8">
                            <FormField
                                control={form.control}
                                name="lowStockThreshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Low Stock Threshold (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., 5"
                                                className="max-w-[300px]"
                                                type="number"
                                                step="1"
                                                min="0"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === '' ? undefined : Number(value));
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Alert when finished items drop below this quantity
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <hr className="border-t border-border" />

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isMakingRequest} className="min-w-[140px]">
                            {isMakingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Design
                        </Button>
                    </div>
                </form>
            </Form>
        </Card>
    );
};

export default AddDesign;
