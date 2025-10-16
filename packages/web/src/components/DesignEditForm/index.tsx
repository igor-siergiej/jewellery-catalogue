import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { type Design, type FormDesign, formDesignSchema } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

import makeEditDesignRequest from '../../api/endpoints/editDesign';
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

interface DesignEditFormProps {
    design: Design;
    onSuccess: () => void;
    onCancel: () => void;
}

const DesignEditForm: React.FC<DesignEditFormProps> = ({ design, onSuccess, onCancel }) => {
    const form = useForm<FormDesign>({
        resolver: zodResolver(formDesignSchema),
        mode: 'onSubmit',
        defaultValues: {
            name: design.name,
            timeRequired: design.timeRequired,
            materials: design.materials,
            description: design.description,
            totalMaterialCosts: design.totalMaterialCosts,
            price: design.price,
            image: design.imageId,
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
            await makeEditDesignRequest(design.id, data, () => accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Success!',
                    message: 'Design updated successfully!',
                    severity: 'success',
                    variant: 'standard',
                },
            });
            onSuccess();
        } catch (e) {
            console.error('[DesignEditForm] Error updating design:', e);
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occurred during the updating of the design!',
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
    }, [selectedMaterials, currentTimeRequired, data, form]);

    if (!data) {
        return null;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isMakingRequest}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isMakingRequest} className="min-w-[140px]">
                        {isMakingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default DesignEditForm;
