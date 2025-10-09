import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { MaterialType } from '@jewellery-catalogue/types';
import { Link, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

import makeAddMaterialRequest from '../../api/endpoints/addMaterial';
import MaterialFormResolver from '../../components/MaterialFormResolver';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { MATERIAL_TYPE_LABELS } from '../../lib/materialLabels';
import { type AddMaterialFormData, addMaterialSchema } from '../../schemas/addMaterialSchema';

const AddMaterial = () => {
    const form = useForm<AddMaterialFormData>({
        resolver: zodResolver(addMaterialSchema),
        defaultValues: {
            name: '',
            brand: '',
            purchaseUrl: '',
            pricePerPack: undefined,
            packs: undefined,
            type: undefined,
        } as any, // TypeScript workaround for discriminated union defaults
    });

    const [isMakingRequest, setIsMakingRequest] = useState(false);
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();

    const currentMaterialType = form.watch('type');

    const onSubmit = async (data: AddMaterialFormData) => {
        setIsMakingRequest(true);
        try {
            await makeAddMaterialRequest(data, accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Yahoooo!',
                    message: 'Added material successfully!',
                    severity: 'success',
                    variant: 'standard',
                },
            });
            form.reset();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during adding material! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsMakingRequest(false);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <Card className="p-6 md:p-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div>
                            <h1 className="text-2xl font-bold leading-[50px] truncate">Adding New Material</h1>
                            <div className="border-b border-border mt-2" />
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                            <div className="lg:w-1/4">
                                <h2 className="text-lg lg:text-xl font-semibold lg:text-right lg:pt-1.5">
                                    Material Details
                                </h2>
                            </div>

                            <div className="lg:w-3/4 space-y-4 lg:space-y-5">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="max-w-[300px]">
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="brand"
                                    render={({ field }) => (
                                        <FormItem className="max-w-[300px]">
                                            <FormLabel>Brand</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="purchaseUrl"
                                    render={({ field }) => (
                                        <FormItem className="max-w-[400px]">
                                            <FormLabel>URL</FormLabel>
                                            <FormControl>
                                                <InputGroup>
                                                    <InputGroupAddon align="inline-start">
                                                        <InputGroupText>
                                                            <Link className="size-4" />
                                                        </InputGroupText>
                                                    </InputGroupAddon>
                                                    <InputGroupInput {...field} />
                                                </InputGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="pricePerPack"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Price per Pack</FormLabel>
                                            <FormControl>
                                                <InputGroup className="max-w-[100px]">
                                                    <InputGroupAddon align="inline-start">
                                                        <InputGroupText>£</InputGroupText>
                                                    </InputGroupAddon>
                                                    <InputGroupInput
                                                        type="number"
                                                        step="0.01"
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

                                <FormField
                                    control={form.control}
                                    name="packs"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Number of new packs</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="max-w-[100px]"
                                                    type="number"
                                                    step="1"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;

                                                        field.onChange(value === '' ? undefined : Number(value));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="border-b border-border" />

                        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                            <div className="lg:w-1/4">
                                <h2 className="text-lg lg:text-xl font-semibold lg:text-right">Material Type</h2>
                            </div>

                            <div className="lg:w-3/4 space-y-4 lg:space-y-5">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Material Type</FormLabel>
                                            <FormControl>
                                                <ButtonGroup className="w-full sm:w-auto">
                                                    {(Object.keys(MaterialType) as Array<MaterialType>).map((type) => (
                                                        <Button
                                                            key={type}
                                                            type="button"
                                                            variant={field.value === type ? 'secondary' : 'outline'}
                                                            onClick={() => field.onChange(type)}
                                                            className="flex-1 sm:flex-none"
                                                        >
                                                            {MATERIAL_TYPE_LABELS[type]}
                                                        </Button>
                                                    ))}
                                                </ButtonGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <MaterialFormResolver
                                    control={form.control}
                                    materialType={currentMaterialType}
                                    form={form}
                                />
                            </div>
                        </div>

                        <div className="border-b border-border" />

                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={isMakingRequest}
                                className="min-w-32 w-full sm:w-auto"
                            >
                                {isMakingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Material!
                            </Button>
                        </div>
                    </form>
                </Form>
            </Card>
        </div>
    );
};

export default AddMaterial;
