import { zodResolver } from '@hookform/resolvers/zod';
import { type Design, type FormDesign, formDesignSchema } from '@jewellery-catalogue/types';
import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';

import makeEditDesignRequest from '../../api/endpoints/editDesign';
import { AlertStoreActions } from '../../context/Alert/types';
import { useDesignFormSupport } from '../../hooks/useDesignFormSupport';
import { DesignForm } from '../DesignForm';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { StateView } from '../StateView';

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

    const [isMakingRequest, setIsMakingRequest] = useState(false);

    const { accessToken, login, logout, dispatch, materialsQuery, computeFormVariants, reportSaveError } =
        useDesignFormSupport(form);

    const { data, isError, refetch } = materialsQuery;

    const onSubmit: SubmitHandler<FormDesign> = async (formData) => {
        setIsMakingRequest(true);

        try {
            const variants = computeFormVariants();

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
            reportSaveError('Updating design failed', e);
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
                    <DesignForm form={form} mode="edit" materials={data} />
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
