import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { type Design, type RequiredMaterial, type UpdateDesign, updateDesignSchema } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { getMaterialsQuery } from '@/api/endpoints/getMaterials';
import makeUpdateDesignRequest from '@/api/endpoints/updateDesign';
import { OptionalNumberInput } from '@/components/OptionalNumberInput';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { StateView } from '@/components/StateView';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VariantSelector } from '@/components/VariantSelector';
import { useAlert } from '@/context/Alert';
import { AlertStoreActions } from '@/context/Alert/types';
import { useEtsySyncQuantity } from '@/hooks/useEtsySyncQuantity';
import {
    describeAvailability,
    formatAmount,
    getMaterialAvailability,
    type MaterialAvailability,
} from '@/lib/materialAvailability';
import { cn, pluralise } from '@/lib/utils';

interface InventoryDialogProps {
    design: Design;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
    <section className="space-y-3 py-5 first:pt-0 last:pb-0">
        <div>
            <h3 className="text-base font-semibold">{title}</h3>
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
        {children}
    </section>
);

const showError = (dispatch: ReturnType<typeof useAlert>['dispatch'], title: string, e: unknown) =>
    dispatch({
        type: AlertStoreActions.SHOW_ALERT,
        payload: {
            title,
            message: `Details: ${e instanceof Error ? e.message : 'Unknown error'}`,
            severity: 'error',
            variant: 'standard',
        },
    });

const showSuccess = (dispatch: ReturnType<typeof useAlert>['dispatch'], message: string) =>
    dispatch({
        type: AlertStoreActions.SHOW_ALERT,
        payload: { title: 'Success', message, severity: 'success', variant: 'standard' },
    });

const InventoryDialogContent: React.FC<InventoryDialogProps> = ({ design, open, onOpenChange, onSuccess }) => {
    const formId = useId();
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();

    const hasVariants = (design.variants?.length ?? 0) > 0;
    const [stockValue, setStockValue] = useState<number | ''>('');
    const [isSettingStock, setIsSettingStock] = useState(false);
    const { sync: syncEtsyQuantity, isSyncing: isSyncingEtsyQuantity } = useEtsySyncQuantity(design.id);

    const selectedVariant = design.variants?.find((v) => v.id === selectedVariantId);
    const currentStockForSelection = hasVariants ? (selectedVariant?.totalQuantity ?? 0) : design.totalQuantity;

    const {
        data: allMaterials,
        isLoading: materialsLoading,
        isError: materialsFailed,
        refetch: refetchMaterials,
    } = useQuery({
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

    // Shared materials always count; a variant adds the materials of its chosen options
    const allMaterialAvailability: MaterialAvailability[] = useMemo(() => {
        if (!allMaterials) return [];

        const required: RequiredMaterial[] = [...design.materials];

        if (hasVariants && selectedVariant) {
            for (const optionId of selectedVariant.optionIds) {
                const option = (design.variationGroups ?? [])
                    .flatMap((group) => group.options)
                    .find((o) => o.id === optionId);

                if (option) required.push(option.material);
            }
        }

        return required.map((material) => getMaterialAvailability(material, allMaterials));
    }, [allMaterials, design.materials, design.variationGroups, hasVariants, selectedVariant]);

    const maxCanProduce = useMemo(() => {
        if (allMaterialAvailability.length === 0) return 0;

        return Math.min(...allMaterialAvailability.map((m) => m.canMake));
    }, [allMaterialAvailability]);

    const showsProduction = !hasVariants || !!selectedVariantId;
    const canMakeDisplay = showsProduction && allMaterialAvailability.length > 0 ? String(maxCanProduce) : '–';

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
                    title: 'Select a variant',
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
                    title: 'Not enough materials',
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

            showSuccess(dispatch, 'Design inventory updated');
            onSuccess();
        } catch (e) {
            showError(dispatch, 'Error updating design', e);
        } finally {
            setIsUpdating(false);
        }
    };

    const stockCanBeSet = stockValue !== '' && stockValue >= 0 && (!hasVariants || !!selectedVariantId);

    const handleSetStock = async () => {
        if (!stockCanBeSet) return;

        setIsSettingStock(true);

        try {
            await makeUpdateDesignRequest(
                design.id,
                { totalQuantity: stockValue as number, variantId: selectedVariantId },
                () => accessToken,
                login,
                logout
            );

            showSuccess(dispatch, 'Stock updated');
            setStockValue('');
            onSuccess();
        } catch (e) {
            showError(dispatch, 'Error updating stock', e);
        } finally {
            setIsSettingStock(false);
        }
    };

    const handleSyncFromEtsy = async () => {
        try {
            await syncEtsyQuantity();
            showSuccess(dispatch, 'Stock synced from Etsy');
            onSuccess();
        } catch (e) {
            showError(dispatch, 'Error syncing from Etsy', e);
        }
    };

    const canSubmit = !materialsLoading && showsProduction && maxCanProduce > 0;
    const quantityNeeded = addQuantity && addQuantity > 0 ? addQuantity : 0;

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={`Stock for ${design.name}`}
            className="sm:max-w-2xl"
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} disabled={isUpdating || !canSubmit}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Produce designs
                    </Button>
                </>
            }
        >
            <Form {...form}>
                <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="divide-y divide-border">
                    <Section title="Current stock">
                        <dl className="grid grid-cols-2 gap-4">
                            <div>
                                <dt className="text-sm text-muted-foreground">In stock</dt>
                                <dd className="text-2xl font-semibold">{design.totalQuantity}</dd>
                                {hasVariants && <dd className="text-xs text-muted-foreground">Across all variants</dd>}
                            </div>
                            <div>
                                <dt className="text-sm text-muted-foreground">Can make</dt>
                                <dd className="text-2xl font-semibold" data-testid="inventory-can-make">
                                    {canMakeDisplay}
                                </dd>
                                {hasVariants && !selectedVariantId && (
                                    <dd className="text-xs text-muted-foreground">Pick a variant to see this</dd>
                                )}
                            </div>
                        </dl>
                    </Section>

                    <Section
                        title="Set stock"
                        hint={`Correct the ${hasVariants ? "selected variant's" : "design's"} count directly. Materials are not used.`}
                    >
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="set-stock-quantity">New stock count</Label>
                                <Input
                                    id="set-stock-quantity"
                                    className="w-40"
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
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        void handleSetStock();
                                    }}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSettingStock || !stockCanBeSet}
                                onClick={handleSetStock}
                            >
                                {isSettingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Set stock
                            </Button>
                            {!hasVariants && design.etsy?.listingId && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSyncingEtsyQuantity}
                                    onClick={handleSyncFromEtsy}
                                >
                                    {isSyncingEtsyQuantity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sync from Etsy
                                </Button>
                            )}
                        </div>
                        {hasVariants && !selectedVariantId && (
                            <p className="text-sm text-muted-foreground">Pick a variant below to set its stock.</p>
                        )}
                    </Section>

                    {materialsLoading && <StateView kind="loading" what="materials" />}
                    {materialsFailed && <StateView kind="error" what="materials" onRetry={() => refetchMaterials()} />}

                    {hasVariants && allMaterials && (
                        <Section title="Variant to produce" hint="Select a row to choose the variant.">
                            <VariantSelector
                                design={design}
                                allMaterials={allMaterials}
                                selectedVariantId={selectedVariantId}
                                onSelect={setSelectedVariantId}
                            />
                        </Section>
                    )}

                    {allMaterials && showsProduction && (
                        <>
                            <Section title={hasVariants ? 'Materials for this variant' : 'Materials'}>
                                {allMaterialAvailability.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">This design lists no materials.</p>
                                ) : (
                                    <div className="rounded-lg border bg-card">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead>Material</TableHead>
                                                    <TableHead data-numeric>Needs per design</TableHead>
                                                    <TableHead data-numeric>In stock</TableHead>
                                                    <TableHead data-numeric>Can make</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {allMaterialAvailability.map((ma) => {
                                                    const status = ma.missing
                                                        ? 'No longer in materials'
                                                        : describeAvailability({ ...ma, quantity: quantityNeeded });

                                                    return (
                                                        <TableRow key={ma.material.id}>
                                                            <TableCell
                                                                data-name
                                                                title={ma.material.name}
                                                                className="w-full font-medium"
                                                            >
                                                                {ma.material.name}
                                                            </TableCell>
                                                            <TableCell data-numeric>
                                                                {formatAmount(ma.required)} {ma.unit}
                                                            </TableCell>
                                                            <TableCell data-numeric>
                                                                {formatAmount(ma.available)} {ma.unit}
                                                            </TableCell>
                                                            <TableCell data-numeric>{ma.canMake}</TableCell>
                                                            <TableCell
                                                                className={cn(
                                                                    'whitespace-nowrap',
                                                                    status !== 'Enough' && 'text-destructive'
                                                                )}
                                                            >
                                                                {status}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </Section>

                            <Section title="Produce">
                                <FormField
                                    control={form.control}
                                    name="addQuantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantity to produce</FormLabel>
                                            <FormControl>
                                                <OptionalNumberInput
                                                    className="w-40"
                                                    max={maxCanProduce}
                                                    placeholder="0"
                                                    field={field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Up to {pluralise(maxCanProduce, 'design')}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {estimatedMaterialLevels && addQuantity && addQuantity > 0 && (
                                    <Alert>
                                        <AlertTitle>Estimated changes</AlertTitle>
                                        <AlertDescription>
                                            <div className="mt-2 space-y-2">
                                                <p className="font-semibold">
                                                    {hasVariants && selectedVariant
                                                        ? `${selectedVariant.name} stock: ${selectedVariant.totalQuantity + addQuantity} (+${addQuantity})`
                                                        : `New stock: ${design.totalQuantity + addQuantity} (+${addQuantity})`}
                                                </p>
                                                <p className="text-sm font-semibold">Materials used</p>
                                                <ul className="space-y-1 text-sm">
                                                    {estimatedMaterialLevels.map((eml) => (
                                                        <li key={eml.material.id}>
                                                            {eml.material.name}: {formatAmount(eml.available)}{' '}
                                                            {eml.unit} → {formatAmount(eml.newAvailable)} {eml.unit}
                                                            <span className="ml-1 text-muted-foreground">
                                                                (-{formatAmount(eml.required * addQuantity)} {eml.unit})
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {maxCanProduce === 0 && (
                                    <Alert className="border-destructive text-destructive">
                                        <AlertTitle>Cannot produce yet</AlertTitle>
                                        <AlertDescription>
                                            {allMaterialAvailability.length === 0
                                                ? 'This design lists no materials to make it from.'
                                                : 'There are not enough materials to make one. Restock materials first.'}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </Section>
                        </>
                    )}
                </form>
            </Form>
        </ResponsiveDialog>
    );
};

const InventoryDialog: React.FC<InventoryDialogProps> = (props) =>
    props.open ? <InventoryDialogContent {...props} /> : null;

export default InventoryDialog;
