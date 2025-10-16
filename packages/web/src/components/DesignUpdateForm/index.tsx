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
import { useAlert } from '@/context/Alert';
import { AlertStoreActions } from '@/context/Alert/types';
import { WIRE_TYPE_LABELS } from '@/lib/materialLabels';

export interface IDesignUpdateFormProps {
    design: Design;
    onSuccess: () => void;
    onCancel: () => void;
}

interface MaterialAvailability {
    material: Material;
    required: number;
    available: number;
    canMake: number;
    unit: string;
    status: 'sufficient' | 'low' | 'insufficient';
}

const DesignUpdateForm: React.FC<IDesignUpdateFormProps> = ({ design, onSuccess, onCancel }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();

    // Fetch all materials to check availability
    const { data: allMaterials, isLoading: materialsLoading } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const form = useForm<UpdateDesign>({
        resolver: zodResolver(updateDesignSchema),
        mode: 'onChange',
        defaultValues: {
            addQuantity: undefined,
        },
    });

    const addQuantity = form.watch('addQuantity');

    // Calculate material availability
    const materialAvailability: MaterialAvailability[] = useMemo(() => {
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
                    required = (requiredMaterial as any).requiredLength;
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

            let status: 'sufficient' | 'low' | 'insufficient';
            if (canMake === 0) {
                status = 'insufficient';
            } else if (canMake < 5) {
                status = 'low';
            } else {
                status = 'sufficient';
            }

            return {
                material,
                required,
                available,
                canMake,
                unit,
                status,
            };
        });
    }, [allMaterials, design.materials]);

    // Calculate max quantity that can be produced
    const maxCanProduce = useMemo(() => {
        if (materialAvailability.length === 0) return 0;
        return Math.min(...materialAvailability.map((m) => m.canMake));
    }, [materialAvailability]);

    // Calculate new material levels after production
    const estimatedMaterialLevels = useMemo(() => {
        if (!addQuantity || addQuantity <= 0) return null;

        return materialAvailability.map((ma) => ({
            ...ma,
            newAvailable: ma.available - ma.required * addQuantity,
        }));
    }, [addQuantity, materialAvailability]);

    const onSubmit = async (data: UpdateDesign) => {
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
            await makeUpdateDesignRequest(design.id, data, () => accessToken, login, logout);

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

    if (materialsLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

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
                                <p className="text-muted-foreground">Designs in Stock</p>
                                <p className="font-semibold text-2xl">{design.totalQuantity}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Max Can Produce</p>
                                <p className="font-semibold text-2xl">{maxCanProduce}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                {/* Material Availability Table */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Material Availability</h3>
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
                                {materialAvailability.map((ma) => (
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

                    {/* Estimated Results */}
                    {estimatedMaterialLevels && addQuantity && addQuantity > 0 && (
                        <Alert>
                            <AlertTitle>Estimated Changes</AlertTitle>
                            <AlertDescription>
                                <div className="space-y-2 mt-2">
                                    <p className="font-semibold">
                                        New Design Stock: {design.totalQuantity + addQuantity} ({addQuantity > 0 && '+'}
                                        {addQuantity})
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
                                You do not have sufficient materials to produce any designs. Please restock materials
                                first.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isUpdating}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isUpdating || maxCanProduce === 0}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Produce Designs
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default DesignUpdateForm;
