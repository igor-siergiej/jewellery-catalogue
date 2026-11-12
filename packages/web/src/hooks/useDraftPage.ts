import { useAuth } from '@imapps/web-utils';
import type { DraftType } from '@jewellery-catalogue/types';
import { useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';

import { DRAFTS_ENDPOINT } from '../api/endpoints';
import { useDraftStatus } from '../context/DraftStatus';
import { useDraftAutosave } from './useDraftAutosave';

interface LoadedDraft {
    data?: Record<string, unknown>;
    imageId?: string;
}

interface UseDraftPageOptions {
    form: UseFormReturn<any>;
    type: DraftType;
    onLoaded: (draft: LoadedDraft) => void;
}

/** Autosaves the form as a draft and, when the URL has a `draftId`, loads that draft into the form. */
export const useDraftPage = ({ form, type, onLoaded }: UseDraftPageOptions) => {
    const { accessToken, login, logout } = useAuth();
    const [searchParams] = useSearchParams();
    const draftId = searchParams.get('draftId');
    const { setDraftStatus, clearDraftStatus } = useDraftStatus();
    const [isLoadingDraft, setIsLoadingDraft] = useState(false);
    const onLoadedRef = useRef(onLoaded);
    onLoadedRef.current = onLoaded;

    const { uploadedImageId, deleteAndClearDraft } = useDraftAutosave({
        form,
        type,
        initialDraftId: draftId,
        getAccessToken: () => accessToken,
        onTokenRefresh: login,
        onTokenClear: logout,
        onStatusChange: setDraftStatus,
    });

    useEffect(() => () => clearDraftStatus(), [clearDraftStatus]);

    useEffect(() => {
        if (!draftId || !accessToken) return;

        setIsLoadingDraft(true);

        fetch(`${DRAFTS_ENDPOINT}/${draftId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
            .then((res) => res.json())
            .then((draft) => onLoadedRef.current(draft ?? {}))
            .catch(() => {})
            .finally(() => setIsLoadingDraft(false));
    }, [draftId, accessToken]);

    return { isLoadingDraft, uploadedImageId, deleteAndClearDraft };
};
