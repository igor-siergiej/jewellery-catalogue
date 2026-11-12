import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { type Design, type FormDesign, formDesignSchema } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';

import makeEditDesignRequest from '../../api/endpoints/editDesign';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { useUserSettings } from '../../hooks/useUserSettings';
import { errorContext, logger } from '../../utils/logger';
import { DesignForm } from '../DesignForm';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { StateView } from '../StateView';
import { computeVariants } from '../VariationGroupBuilder';

interface EditDesignDialogProps {
    design: Design;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const toFormValues = (design: Design): FormDesign => ({
    name: design.name,
    timeRequired: design.timeRequired,
    materials: design.materials,
    description: design.description,
    totalMaterialCosts: design.totalMaterialCosts,
    price: design.price,
    images: design.imageIds,
    diagramImages: design.diagramImageIds ?? [],
    makingNotes: design.makingNotes ?? '',
    lowStockThreshold: design.lowStockThreshold,
    variationGroups: design.variationGroups ?? [],
    variants: design.variants ?? [],
    designType: design.designType,
    catalogueOnly: design.catalogueOnly ?? false,
});

const EditDesignDialog: React.FC<EditDesignDialogProps> = ({ design, open, onOpenChange, onSuccess }) => {
    const formId = useId();

    const form = useForm<FormDesign>({
        resolver: zodResolver(formDesignSchema),
        mode: 'onSubmit',
        defaultValues: toFormValues(design),
    });

    const { accessToken, login, logout } = useAuth();
    const [isMakingRequest, setIsMakingRequest] = useState(false);
    const { hourlyWage, profitMargin } = useUserSettings();

    const { data, isError, refetch } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const selectedMaterials = form.watch('materials');
    const currentTimeRequired = form.watch('timeRequired');
    const variationGroups = form.watch('variationGroups') ?? [];

    const { dispatch } = useAlert();

    // Each opening starts from the saved design; the session key remounts the fields so their local state resets too
    const designRef = useRef(design);
    designRef.current = design;
    const [session, setSession] = useState(0);

    useLayoutEffect(() => {
        if (!open) return;

        form.reset(toFormValues(designRef.current));
        setSession((n) => n + 1);
    }, [open, form]);

    const onSubmit: SubmitHandler<FormDesign> = async (formData) => {
        setIsMakingRequest(true);

        try {
            const variants = computeVariants(
                variationGroups,
                selectedMaterials,
                hourlyWage,
                profitMargin,
                currentTimeRequired
            );

            await makeEditDesignRequest(design.id, { ...formData, variants }, () => accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Design saved',
                    message: 'Your changes are saved.',
                    severity: 'success',
                    variant: 'standard',
                },
            });
            onSuccess();
        } catch (e) {
            logger.error('Updating design failed', errorContext(e));
            const message = e instanceof Error ? e.message : 'Unknown error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: "Couldn't save the design. Try again.",
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsMakingRequest(false);
        }
    };

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
        }
    };

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Edit design"
            className="sm:max-w-[900px]"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isMakingRequest}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} disabled={isMakingRequest || !data} className="min-w-[140px]">
                        {isMakingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save changes
                    </Button>
                </>
            }
        >
            {data ? (
                <form id={formId} onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleFormKeyDown}>
                    <DesignForm key={session} form={form} mode="edit" materials={data} />
                </form>
            ) : isError ? (
                <StateView kind="error" what="materials" onRetry={() => refetch()} />
            ) : (
                <StateView kind="loading" what="materials" />
            )}
        </ResponsiveDialog>
    );
};

export default EditDesignDialog;
