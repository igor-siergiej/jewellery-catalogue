import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import {
    type Design,
    type Material,
    MaterialType,
    type RequiredMaterial,
    type UpdateDesign,
    updateDesignSchema,
} from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getMaterialsQuery } from '@/api/endpoints/getMaterials';
import makeUpdateDesignRequest from '@/api/endpoints/updateDesign';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VariantSelector } from '@/components/VariantSelector';
import { useAlert } from '@/context/Alert';
import { AlertStoreActions } from '@/context/Alert/types';
import { useEtsySyncQuantity } from '@/hooks/useEtsySyncQuantity';
import { WIRE_TYPE_LABELS } from '@/lib/materialLabels';

interface IDesignUpdateFormProps {
    design: Design;
    onSuccess: () => void;
    onCancel: () => void;
    initialVariantId?: string;
}

interface MaterialAvailability {
    material: Material;
    required: number;
    available: number;
    canMake: number;
    unit: string;
    status: 'sufficient' | 'low' | 'insufficient';
}

const DesignUpdateForm: React.FC<IDesignUpdateFormProps> = ({ design, onSuccess, onCancel, initialVariantId }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(initialVariantId);
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();

    const hasVariants = (design.variants?.length ?? 0) > 0;
    const [stockValue, setStockValue] = useState<number | ''>('');
    const [isSettingStock, setIsSettingStock] = useState(false);
    const { sync: syncEtsyQuantity, isSyncing: isSyncingEtsyQuantity } = useEtsySyncQuantity(design.id);

    const currentStockForSelection = hasVariants
        ? (design.variants?.find((v) => v.id === selectedVariantId)?.totalQuantity ?? 0)
        : design.totalQuantity;

    const { data: allMaterials, isLoading: materialsLoading } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const form = useForm<UpdateDesign>({
        resolver: zodResolver(updateDesignSchema),
        mode: 'onChange',
        defaultValues: {
            addQuantity: undefined,
            variantId: undefined,
        },
    });

    const addQuantity = form.watch('addQuantity');

    // Shared material availability (always shown)
    const sharedMaterialAvailability: MaterialAvailability[] = useMemo(() => {
        if (!allMaterials) return [];

        return design.materials.map((requiredMaterial: RequiredMaterial) => {
            const material = allMaterials.find((m) => m.id === requiredMaterial.id);

            if (!material) {
                return {
                    material: requiredMaterial as Material,
                    required: 0,
                    available: 0,
                    canMake: 0,
                    unit: '',
                    status: 'insufficient' as const,
                };
            }

            let required: number;
            let available: number;
            let unit: string;

            switch (material.type) {
                case MaterialType.WIRE:
                case MaterialType.CHAIN: {
                    required = (requiredMaterial as any).requiredLength / 100;
                    available = (material as any).totalLength;
                    unit = 'm';
                    break;
                }
                case MaterialType.BEAD:
                case MaterialType.EAR_HOOK: {
                    required = (requiredMaterial as any).requiredQuantity;
                    available = (material as any).totalQuantity;
                    unit = 'pcs';
                    break;
                }
                default:
                    required = 0;
                    available = 0;
                    unit = '';
            }

            const canMake = required > 0 ? Math.floor(available / required) : 0;
            const status: MaterialAvailability['status'] =
                canMake === 0 ? 'insufficient' : canMake < 5 ? 'low' : 'sufficient';

            return { material, required, available, canMake, unit, status };
        });
    }, [allMaterials, design.materials]);

    // For variant designs: availability of selected variant's option materials
    const variantMaterialAvailability: MaterialAvailability[] = useMemo(() => {
        if (!allMaterials || !selectedVariantId || !hasVariants) return [];

        const variant = design.variants!.find((v) => v.id === selectedVariantId);
        if (!variant) return [];

        const groups = design.variationGroups ?? [];
        const optionMaterials: RequiredMaterial[] = [];

        for (const optionId of variant.optionIds) {
            for (const group of groups) {
                const option = group.options.find((o) => o.id === optionId);
                if (option) {
                    optionMaterials.push(option.material);
                    break;
                }
            }
        }

        return optionMaterials.map((requiredMaterial) => {
            const material = allMaterials.find((m) => m.id === requiredMaterial.id);

            if (!material) {
                return {
                    material: requiredMaterial as Material,
                    required: 0,
                    available: 0,
                    canMake: 0,
                    unit: '',
                    status: 'insufficient' as const,
                };
            }

            let required: number;
            let available: number;
            let unit: string;

            switch (material.type) {
                case MaterialType.WIRE:
                case MaterialType.CHAIN: {
                    required = (requiredMaterial as any).requiredLength / 100;
                    available = (material as any).totalLength;
                    unit = 'm';
                    break;
                }
                case MaterialType.BEAD:
                case MaterialType.EAR_HOOK: {
                    required = (requiredMaterial as any).requiredQuantity;
                    available = (material as any).totalQuantity;
                    unit = 'pcs';
                    break;
                }
                default:
                    required = 0;
                    available = 0;
                    unit = '';
            }

            const canMake = required > 0 ? Math.floor(available / required) : 0;
            const status: MaterialAvailability['status'] =
                canMake === 0 ? 'insufficient' : canMake < 5 ? 'low' : 'sufficient';

            return { material, required, available, canMake, unit, status };
        });
    }, [allMaterials, selectedVariantId, hasVariants, design]);

    const allMaterialAvailability = useMemo(
        () => [...sharedMaterialAvailability, ...variantMaterialAvailability],
        [sharedMaterialAvailability, variantMaterialAvailability]
    );

    const maxCanProduce = useMemo(() => {
        if (allMaterialAvailability.length === 0) return 0;
        return Math.min(...allMaterialAvailability.map((m) => m.canMake));
    }, [allMaterialAvailability]);

    const estimatedMaterialLevels = useMemo(() => {
        if (!addQuantity || addQuantity <= 0) return null;
        return allMaterialAvailability.map((ma) => ({
            ...ma,
            newAvailable: ma.available - ma.required * addQuantity,
        }));
    }, [addQuantity, allMaterialAvailability]);

    const onSubmit = async (data: UpdateDesign) => {
        if (hasVariants && !selectedVariantId) {
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Select a Variant',
                    message: 'Please select which variant you want to produce.',
                    severity: 'error',
                    variant: 'standard',
                },
            });
            return;
        }

        if (data.addQuantity && data.addQuantity > maxCanProduce) {
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Insufficient Materials',
                    message: `You can only produce ${maxCanProduce} design(s) with current stock.`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
            return;
        }

        setIsUpdating(true);
        try {
            await makeUpdateDesignRequest(
                design.id,
                { ...data, variantId: selectedVariantId },
                () => accessToken,
                login,
                logout
            );

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Success!',
                    message: 'Design inventory updated successfully!',
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
                    title: 'Error updating design',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSetStock = async () => {
        if (stockValue === '' || stockValue < 0) return;
        if (hasVariants && !selectedVariantId) return;

        setIsSettingStock(true);
        try {
            await makeUpdateDesignRequest(
                design.id,
                { totalQuantity: stockValue, variantId: selectedVariantId },
                () => accessToken,
                login,
                logout
            );

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: { title: 'Success!', message: 'Stock updated!', severity: 'success', variant: 'standard' },
            });

            setStockValue('');
            onSuccess();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error updating stock',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsSettingStock(false);
        }
    };

    const handleSyncFromEtsy = async () => {
        try {
            await syncEtsyQuantity();
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Success!',
                    message: 'Stock synced from Etsy!',
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
                    title: 'Error syncing from Etsy',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        }
    };

    if (materialsLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const canSubmit = hasVariants ? !!selectedVariantId && maxCanProduce > 0 : maxCanProduce > 0;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Current Stock Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Current Inventory</CardTitle>
                        <CardDescription>Design: {design.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">
                                    {hasVariants ? 'Total In Stock' : 'Designs in Stock'}
                                </p>
                                <p className="font-semibold text-2xl">{design.totalQuantity}</p>
                            </div>
                            {!hasVariants && (
                                <div>
                                    <p className="text-muted-foreground">Max Can Produce</p>
                                    <p className="font-semibold text-2xl">{maxCanProduce}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                {/* Set Stock Section — a direct correction, doesn't touch material stock */}
                <Card>
                    <CardHeader>
                        <CardTitle>Set Stock</CardTitle>
                        <CardDescription>
                            Directly correct the {hasVariants ? 'selected variant' : 'design'}'s stock count.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-end gap-3">
                        <div className="space-y-2">
                            <FormLabel htmlFor="set-stock-quantity">
                                New Quantity{hasVariants ? ' (select a variant below)' : ''}
                            </FormLabel>
                            <Input
                                id="set-stock-quantity"
                                className="max-w-[160px]"
                                type="number"
                                step="1"
                                min="0"
                                placeholder={String(currentStockForSelection)}
                                disabled={hasVariants && !selectedVariantId}
                                value={stockValue}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setStockValue(value === '' ? '' : Number(value));
                                }}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={isSettingStock || stockValue === '' || (hasVariants && !selectedVariantId)}
                            onClick={handleSetStock}
                        >
                            {isSettingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Stock
                        </Button>
                        {!hasVariants && design.etsy?.listingId && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSyncingEtsyQuantity}
                                onClick={handleSyncFromEtsy}
                                title="Pull the current quantity from the linked Etsy listing"
                            >
                                {isSyncingEtsyQuantity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sync from Etsy
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Separator />

                {/* Variant selector */}
                {hasVariants && allMaterials && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Select Variant to Produce</h3>
                        <VariantSelector
                            design={design}
                            allMaterials={allMaterials}
                            selectedVariantId={selectedVariantId}
                            onSelect={setSelectedVariantId}
                        />
                        {!selectedVariantId && (
                            <p className="text-xs text-muted-foreground">Click a row to select the variant.</p>
                        )}
                    </div>
                )}

                {/* Material Availability Table */}
                {(!hasVariants || selectedVariantId) && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold">
                                {hasVariants ? 'Material Availability for Selected Variant' : 'Material Availability'}
                            </h3>
                            <div className="rounded-md border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-semibold">Material</TableHead>
                                            <TableHead className="font-semibold">Type</TableHead>
                                            <TableHead className="font-semibold">Required/Design</TableHead>
                                            <TableHead className="font-semibold">In Stock</TableHead>
                                            <TableHead className="font-semibold">Can Make</TableHead>
                                            <TableHead className="font-semibold">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allMaterialAvailability.map((ma) => (
                                            <TableRow key={ma.material.id}>
                                                <TableCell className="font-medium">{ma.material.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {ma.material.type === MaterialType.WIRE &&
                                                            WIRE_TYPE_LABELS[(ma.material as any).wireType]}
                                                        {ma.material.type === MaterialType.CHAIN &&
                                                            WIRE_TYPE_LABELS[(ma.material as any).wireType]}
                                                        {ma.material.type === MaterialType.BEAD && 'Bead'}
                                                        {ma.material.type === MaterialType.EAR_HOOK && 'Ear Hook'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {ma.required.toFixed(2)} {ma.unit}
                                                </TableCell>
                                                <TableCell>
                                                    {ma.available.toFixed(2)} {ma.unit}
                                                </TableCell>
                                                <TableCell className="font-semibold">{ma.canMake} designs</TableCell>
                                                <TableCell>
                                                    {ma.status === 'sufficient' && (
                                                        <Badge variant="default" className="bg-green-600">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Sufficient
                                                        </Badge>
                                                    )}
                                                    {ma.status === 'low' && (
                                                        <Badge variant="default" className="bg-yellow-600">
                                                            <AlertCircle className="h-3 w-3 mr-1" />
                                                            Low Stock
                                                        </Badge>
                                                    )}
                                                    {ma.status === 'insufficient' && (
                                                        <Badge variant="destructive">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Insufficient
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <Separator />

                        {/* Produce Designs Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold">Produce Designs</h3>

                            <FormField
                                control={form.control}
                                name="addQuantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity to Produce</FormLabel>
                                        <FormControl>
                                            <Input
                                                className="max-w-[200px]"
                                                type="number"
                                                step="1"
                                                min="0"
                                                max={maxCanProduce}
                                                placeholder="0"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === '' ? undefined : Number(value));
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Maximum: {maxCanProduce} design{maxCanProduce !== 1 ? 's' : ''}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {estimatedMaterialLevels && addQuantity && addQuantity > 0 && (
                                <Alert>
                                    <AlertTitle>Estimated Changes</AlertTitle>
                                    <AlertDescription>
                                        <div className="space-y-2 mt-2">
                                            <p className="font-semibold">
                                                {hasVariants && selectedVariantId
                                                    ? `${design.variants!.find((v) => v.id === selectedVariantId)?.name} stock: ${(design.variants!.find((v) => v.id === selectedVariantId)?.totalQuantity ?? 0) + addQuantity} (+${addQuantity})`
                                                    : `New Design Stock: ${design.totalQuantity + addQuantity} (+${addQuantity})`}
                                            </p>
                                            <p className="text-sm font-semibold mt-3 mb-1">Material Consumption:</p>
                                            <ul className="text-sm space-y-1">
                                                {estimatedMaterialLevels.map((eml) => (
                                                    <li key={eml.material.id}>
                                                        {eml.material.name}: {eml.available.toFixed(2)} {eml.unit} →{' '}
                                                        {eml.newAvailable.toFixed(2)} {eml.unit}
                                                        <span className="text-muted-foreground ml-1">
                                                            (-{(eml.required * addQuantity).toFixed(2)} {eml.unit})
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {maxCanProduce === 0 && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertTitle>Cannot Produce</AlertTitle>
                                    <AlertDescription>
                                        You do not have sufficient materials to produce any designs. Please restock
                                        materials first.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isUpdating}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isUpdating || !canSubmit}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Produce Designs
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default DesignUpdateForm;
