import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { type Material, type UpdateMaterial, UpdateMaterialSchemas } from '@jewellery-catalogue/types';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import makeUpdateMaterialRequest from '@/api/endpoints/updateMaterial';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { useAlert } from '@/context/Alert';
import { AlertStoreActions } from '@/context/Alert/types';

import UpdateFormResolver from './UpdateFormResolver';

export interface IMaterialUpdateFormProps {
    material: Material;
    onSuccess: () => void;
    onCancel: () => void;
}

const MaterialUpdateForm: React.FC<IMaterialUpdateFormProps> = ({ material, onSuccess, onCancel }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();

    // Get the appropriate schema for this material type
    const schema = useMemo(() => UpdateMaterialSchemas[material.type], [material.type]);

    const form = useForm<UpdateMaterial>({
        resolver: zodResolver(schema),
        mode: 'onChange',
        defaultValues: {
            type: material.type,
            name: material.name,
            brand: material.brand,
            purchaseUrl: material.purchaseUrl,
            addPacks: undefined,
        },
    });

    // Watch for changes to calculate new pricing and stock
    const addPacks = form.watch('addPacks');
    const _pricePerPack = form.watch('pricePerPack');
    const currentMaterialType = form.watch('type');
    const lengthPerPack = form.watch('lengthPerPack' as any);
    const quantityPerPack = form.watch('quantityPerPack' as any);
    const totalLength = form.watch('totalLength' as any);
    const totalQuantity = form.watch('totalQuantity' as any);

    // Calculate current stock display (use form value if updated, otherwise original)
    const currentStock = useMemo(() => {
        switch (material.type) {
            case 'WIRE':
            case 'CHAIN': {
                const current = totalLength ?? (material as any).totalLength;
                return `${Number(current).toFixed(2)}m`;
            }
            case 'BEAD':
            case 'EAR_HOOK': {
                const current = totalQuantity ?? (material as any).totalQuantity;
                return `${Math.round(current)} pieces`;
            }
            default:
                return 'N/A';
        }
    }, [material, totalLength, totalQuantity]);

    // Calculate pack size display (use form value if updated, otherwise original)
    const packSize = useMemo(() => {
        switch (material.type) {
            case 'WIRE':
            case 'CHAIN': {
                const perPack = lengthPerPack ?? (material as any).lengthPerPack;
                return `${Number(perPack).toFixed(2)}m per pack`;
            }
            case 'BEAD':
            case 'EAR_HOOK': {
                const perPack = quantityPerPack ?? (material as any).quantityPerPack;
                return `${Math.round(perPack)} per pack`;
            }
            default:
                return 'N/A';
        }
    }, [material, lengthPerPack, quantityPerPack]);

    // Calculate estimated new stock (use updated values from form if changed)
    const estimatedNewStock = useMemo(() => {
        if (!addPacks || addPacks <= 0) return null;

        switch (material.type) {
            case 'WIRE':
            case 'CHAIN': {
                const current = totalLength ?? (material as any).totalLength;
                const perPack = lengthPerPack ?? (material as any).lengthPerPack;
                const additional = addPacks * perPack;
                const total = current + additional;
                return `${Number(total).toFixed(2)}m`;
            }
            case 'BEAD':
            case 'EAR_HOOK': {
                const current = totalQuantity ?? (material as any).totalQuantity;
                const perPack = quantityPerPack ?? (material as any).quantityPerPack;
                const additional = addPacks * perPack;
                const total = current + additional;
                return `${Math.round(total)} pieces`;
            }
            default:
                return null;
        }
    }, [addPacks, material, lengthPerPack, quantityPerPack, totalLength, totalQuantity]);

    const onSubmit = async (data: UpdateMaterial) => {
        setIsUpdating(true);
        try {
            await makeUpdateMaterialRequest(material.id, data, () => accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Success!',
                    message: 'Material updated successfully!',
                    severity: 'success',
                    variant: 'standard',
                },
            });

            onSuccess();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error updating material',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Current Stock Info */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Current Inventory</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Stock Level</p>
                            <p className="font-medium">{currentStock}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Pack Size</p>
                            <p className="font-medium">{packSize}</p>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Material Details and Type-specific fields side by side */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Basic Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Material Details</h3>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
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
                                <FormItem>
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
                                <FormItem>
                                    <FormLabel>Purchase URL</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Type-specific fields */}
                    <UpdateFormResolver
                        control={form.control}
                        materialType={currentMaterialType}
                        form={form}
                        material={material}
                    />
                </div>

                <Separator />

                {/* Pack Pricing and Add Stock side by side */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Pack Pricing */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Pack Pricing</h3>

                        <FormField
                            control={form.control}
                            name="pricePerPack"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price per Pack</FormLabel>
                                    <FormControl>
                                        <InputGroup className="max-w-[150px]">
                                            <InputGroupAddon align="inline-start">
                                                <InputGroupText>£</InputGroupText>
                                            </InputGroupAddon>
                                            <InputGroupInput
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                value={field.value ?? (material as any).pricePerPack ?? ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === '' ? undefined : Number(value));
                                                }}
                                            />
                                        </InputGroup>
                                    </FormControl>
                                    <FormDescription>Current price for buying a new pack</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Add Stock Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Add Stock</h3>

                        <FormField
                            control={form.control}
                            name="addPacks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Add Packs</FormLabel>
                                    <FormControl>
                                        <Input
                                            className="max-w-[150px]"
                                            type="number"
                                            step="1"
                                            placeholder="0"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                field.onChange(value === '' ? undefined : Number(value));
                                            }}
                                        />
                                    </FormControl>
                                    <FormDescription>How many new packs did you buy?</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Reserved space for estimated new stock */}
                        <div className={`rounded-md p-3 text-sm min-h-[60px] ${estimatedNewStock ? 'bg-muted' : ''}`}>
                            {estimatedNewStock ? (
                                <>
                                    <p className="text-muted-foreground">New stock level will be:</p>
                                    <p className="font-semibold">{estimatedNewStock}</p>
                                </>
                            ) : (
                                <p className="text-muted-foreground opacity-0">Placeholder</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isUpdating}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Material
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default MaterialUpdateForm;
