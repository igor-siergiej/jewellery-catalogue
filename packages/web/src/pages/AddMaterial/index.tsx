import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@imapps/web-utils';
import { type FormMaterial, formMaterialSchema, MaterialType } from '@jewellery-catalogue/types';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';

import { MaterialForm } from '@/components/MaterialForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { DRAFTS_ENDPOINT } from '../../api/endpoints';
import makeAddMaterialRequest from '../../api/endpoints/addMaterial';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { useDraftStatus } from '../../context/DraftStatus';
import { useDraftAutosave } from '../../hooks/useDraftAutosave';

const AddMaterial = () => {
    const form = useForm({
        resolver: zodResolver(formMaterialSchema),
        mode: 'onSubmit',
        defaultValues: {
            name: '',
            brand: '',
            purchaseUrl: '',
            materialCode: '',
            type: MaterialType.WIRE,
        },
    });

    const [isMakingRequest, setIsMakingRequest] = useState(false);
    const [isLoadingDraft, setIsLoadingDraft] = useState(false);
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const { setDraftStatus, clearDraftStatus } = useDraftStatus();
    const [searchParams] = useSearchParams();
    const draftIdParam = searchParams.get('draftId');

    const { deleteAndClearDraft } = useDraftAutosave({
        form,
        type: 'material',
        initialDraftId: draftIdParam,
        getAccessToken: () => accessToken,
        onTokenRefresh: login,
        onTokenClear: logout,
        onStatusChange: setDraftStatus,
    });

    // Clear header status when leaving this page
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
            })
            .catch(() => {})
            .finally(() => setIsLoadingDraft(false));
    }, [draftIdParam, accessToken, form.reset]);

    const onSubmit = async (data: FormMaterial) => {
        setIsMakingRequest(true);

        try {
            await makeAddMaterialRequest(data, () => accessToken, login, logout);
            await deleteAndClearDraft(() => accessToken, login, logout);

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Material created',
                    message: 'Added to your materials.',
                    severity: 'success',
                    variant: 'standard',
                },
            });
            form.reset();
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
            setIsMakingRequest(false);
        }
    };

    if (isLoadingDraft) {
        return (
            <div className="container mx-auto max-w-5xl px-4 py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <h1 className="mb-6 truncate font-display text-3xl font-semibold">Add material</h1>
            <Card className="p-4 md:p-8">
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <MaterialForm form={form} mode="create" />
                    <div className="sticky bottom-0 -mx-4 mt-6 flex justify-end border-t border-border bg-card px-4 py-3 md:static md:mx-0 md:border-0 md:px-0 md:pb-0">
                        <Button type="submit" disabled={isMakingRequest} className="w-full md:w-auto md:min-w-[140px]">
                            {isMakingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add material
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default AddMaterial;
