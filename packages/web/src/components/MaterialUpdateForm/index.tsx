import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { type Material, type UpdateMaterial, UpdateMaterialSchemas } from '@jewellery-catalogue/types';
import { Loader2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import makeRecalculateMaterialPricesRequest from '@/api/endpoints/recalculateMaterialPrices';
import makeUpdateMaterialRequest from '@/api/endpoints/updateMaterial';
import { MaterialForm } from '@/components/MaterialForm';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/context/Alert';
import { AlertStoreActions } from '@/context/Alert/types';

interface IMaterialUpdateFormProps {
    material: Material;
    onSuccess: () => void;
    onCancel: () => void;
}

const MaterialUpdateForm: React.FC<IMaterialUpdateFormProps> = ({ material, onSuccess, onCancel }) => {
    const formId = useId();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [pendingRecalculate, setPendingRecalculate] = useState<{ count: number } | null>(null);
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();

    const schema = useMemo(() => UpdateMaterialSchemas[material.type], [material.type]);

    const form = useForm<UpdateMaterial>({
        resolver: zodResolver(schema),
        mode: 'onChange',
        defaultValues: {
            type: material.type,
            name: material.name,
            brand: material.brand,
            purchaseUrl: material.purchaseUrl,
            materialCode: material.materialCode || '',
            addPacks: undefined,
            lowStockThreshold: material.lowStockThreshold,
        },
    });

    const handleRecalculateConfirm = async () => {
        setIsRecalculating(true);

        try {
            const result = await makeRecalculateMaterialPricesRequest(material.id, () => accessToken, login, logout);
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Prices updated',
                    message: `Updated ${result.updated} of ${result.total} design prices.`,
                    severity: 'success',
                    variant: 'standard',
                },
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: "Couldn't update prices. Try again.",
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsRecalculating(false);
            setPendingRecalculate(null);
            onSuccess();
        }
    };

    const onSubmit = async (data: UpdateMaterial) => {
        setIsUpdating(true);

        try {
            const result = await makeUpdateMaterialRequest(material.id, data, () => accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Material saved',
                    message: 'Your changes are saved.',
                    severity: 'success',
                    variant: 'standard',
                },
            });

            if (result.priceChanged && result.affectedDesignsCount > 0) {
                setPendingRecalculate({ count: result.affectedDesignsCount });
            } else {
                onSuccess();
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: "Couldn't save the material. Try again.",
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const count = pendingRecalculate?.count ?? 0;

    return (
        <>
            <AlertDialog
                open={!!pendingRecalculate}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingRecalculate(null);
                        onSuccess();
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Update prices for {count} {count === 1 ? 'design' : 'designs'}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {material.name} is used in {count === 1 ? 'this design' : 'these designs'}. Recalculate{' '}
                            {count === 1 ? 'its selling price' : 'their selling prices'} from the new material cost, or
                            skip and keep the current prices.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRecalculating}>Skip</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRecalculateConfirm} disabled={isRecalculating}>
                            {isRecalculating ? 'Updating…' : 'Update prices'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <ResponsiveDialog
                open={!pendingRecalculate}
                onOpenChange={(open) => !open && onCancel()}
                title="Edit material"
                className="sm:max-w-[900px]"
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isUpdating}>
                            Cancel
                        </Button>
                        <Button type="submit" form={formId} disabled={isUpdating} className="min-w-[140px]">
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save changes
                        </Button>
                    </>
                }
            >
                <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
                    <MaterialForm form={form} mode="edit" material={material} />
                </form>
            </ResponsiveDialog>
        </>
    );
};

export default MaterialUpdateForm;
