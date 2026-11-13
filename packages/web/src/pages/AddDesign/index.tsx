import { zodResolver } from '@hookform/resolvers/zod';
import { type FormDesign, formDesignSchema } from '@jewellery-catalogue/types';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import makeAddDesignRequest from '../../api/endpoints/addDesign';
import { DesignForm } from '../../components/DesignForm';
import { DESIGNS_PAGE } from '../../constants/routes';
import { AlertStoreActions } from '../../context/Alert/types';
import { useDesignFormSupport } from '../../hooks/useDesignFormSupport';
import { useDraftPage } from '../../hooks/useDraftPage';

const DEFAULT_VALUES: Partial<FormDesign> = {
    name: '',
    timeRequired: '',
    materials: [],
    description: '',
    totalMaterialCosts: 0,
    images: [],
    diagramImages: [],
    makingNotes: '',
    lowStockThreshold: undefined,
    variationGroups: [],
    variants: [],
};

const AddDesign: React.FC = () => {
    const form = useForm<FormDesign>({
        resolver: zodResolver(formDesignSchema),
        mode: 'onSubmit',
        defaultValues: DEFAULT_VALUES,
    });

    const [isMakingRequest, setIsMakingRequest] = useState(false);
    const navigate = useNavigate();

    const { accessToken, login, logout, dispatch, materialsQuery, computeFormVariants, reportSaveError } =
        useDesignFormSupport(form);

    const { data } = materialsQuery;

    const { isLoadingDraft, uploadedImageId, deleteAndClearDraft } = useDraftPage({
        form,
        type: 'design',
        onLoaded: (draft) => {
            if (draft.data) {
                form.reset({ ...DEFAULT_VALUES, ...(draft.data as Partial<FormDesign>) });
            }

            if (draft.imageId) {
                form.setValue('images', [draft.imageId]);
            }
        },
    });

    const onSubmit: SubmitHandler<FormDesign> = async (formData) => {
        setIsMakingRequest(true);

        try {
            const variants = computeFormVariants();

            // Replace first File with draft-uploaded imageId if available
            let images = formData.images ?? [];

            if (uploadedImageId) {
                const firstFileIdx = images.findIndex((v) => v instanceof File);

                if (firstFileIdx !== -1) {
                    images = [...images];
                    images[firstFileIdx] = uploadedImageId;
                }
            }

            const submitData = { ...formData, variants, images };

            await makeAddDesignRequest(submitData, () => accessToken, login, logout);
            await deleteAndClearDraft(() => accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Design created',
                    message: 'Added to your catalogue.',
                    severity: 'success',
                    variant: 'standard',
                },
            });
            navigate(DESIGNS_PAGE.route);
        } catch (e) {
            reportSaveError('Adding design failed', e);
        } finally {
            setIsMakingRequest(false);
        }
    };

    if (isLoadingDraft || !data) {
        return null;
    }

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
        }
    };

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <h1 className="mb-6 truncate font-display text-3xl font-semibold">New design</h1>
            <Card className="p-4 md:p-8">
                <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleFormKeyDown}>
                    <DesignForm form={form} mode="create" materials={data} />
                    <div className="sticky bottom-0 -mx-4 mt-6 flex justify-end border-t border-border bg-card px-4 py-3 md:static md:mx-0 md:border-0 md:px-0 md:pb-0">
                        <Button type="submit" disabled={isMakingRequest} className="w-full md:w-auto md:min-w-[140px]">
                            {isMakingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create design
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default AddDesign;
