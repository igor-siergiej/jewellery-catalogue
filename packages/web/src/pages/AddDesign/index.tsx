import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { type FormDesign, formDesignSchema } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { DRAFTS_ENDPOINT } from '../../api/endpoints';
import makeAddDesignRequest from '../../api/endpoints/addDesign';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import { DesignForm } from '../../components/DesignForm';
import { computeVariants } from '../../components/VariationGroupBuilder';
import { DESIGNS_PAGE } from '../../constants/routes';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { useDraftStatus } from '../../context/DraftStatus';
import { useDraftAutosave } from '../../hooks/useDraftAutosave';
import { useUserSettings } from '../../hooks/useUserSettings';
import { errorContext, logger } from '../../utils/logger';

const AddDesign: React.FC = () => {
    const form = useForm<FormDesign>({
        resolver: zodResolver(formDesignSchema),
        mode: 'onSubmit',
        defaultValues: {
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
        },
    });

    const { accessToken, login, logout } = useAuth();
    const [isMakingRequest, setIsMakingRequest] = useState(false);
    const [isLoadingDraft, setIsLoadingDraft] = useState(false);
    const { hourlyWage, profitMargin } = useUserSettings();
    const [searchParams] = useSearchParams();
    const draftIdParam = searchParams.get('draftId');

    const { data } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const selectedMaterials = form.watch('materials');
    const currentTimeRequired = form.watch('timeRequired');
    const variationGroups = form.watch('variationGroups') ?? [];

    const { dispatch } = useAlert();
    const navigate = useNavigate();
    const { setDraftStatus, clearDraftStatus } = useDraftStatus();

    const { uploadedImageId, deleteAndClearDraft } = useDraftAutosave({
        form,
        type: 'design',
        initialDraftId: draftIdParam,
        getAccessToken: () => accessToken,
        onTokenRefresh: login,
        onTokenClear: logout,
        onStatusChange: setDraftStatus,
    });

    useEffect(() => () => clearDraftStatus(), [clearDraftStatus]);

    // Load draft on mount if draftId param present
    useEffect(() => {
        if (!draftIdParam || !accessToken) return;

        setIsLoadingDraft(true);

        fetch(`${DRAFTS_ENDPOINT}/${draftIdParam}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
            .then((res) => res.json())
            .then((draft) => {
                if (draft?.data) {
                    form.reset(draft.data);
                }

                if (draft?.imageId) {
                    form.setValue('images', [draft.imageId]);
                }
            })
            .catch(() => {})
            .finally(() => setIsLoadingDraft(false));
    }, [draftIdParam, accessToken, form.reset, form.setValue]);

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
                    title: 'Yahoooo!',
                    message: 'Added design successfully!',
                    severity: 'success',
                    variant: 'standard',
                },
            });
            navigate(DESIGNS_PAGE.route);
        } catch (e) {
            logger.error('Adding design failed', errorContext(e));
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during the adding of the design! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
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
