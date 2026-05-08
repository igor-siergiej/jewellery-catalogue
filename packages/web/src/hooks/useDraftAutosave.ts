import type { DraftType } from '@jewellery-catalogue/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import {
    makeCreateDraftRequest,
    makeDeleteDraftRequest,
    makeUpdateDraftRequest,
    makeUploadDraftImageRequest,
} from '../api/endpoints/drafts';

const DEBOUNCE_MS = 2000;

interface UseDraftAutosaveOptions {
    form: UseFormReturn<any>;
    type: DraftType;
    initialDraftId?: string | null;
    initialImageId?: string | null;
    getAccessToken: () => string;
    onTokenRefresh: (token: string) => void;
    onTokenClear: () => void;
    onStatusChange?: (status: { isSaving: boolean; saveError: boolean; hasDraft: boolean }) => void;
}

interface UseDraftAutosaveResult {
    draftId: string | null;
    isSaving: boolean;
    saveError: boolean;
    uploadedImageId: string | null;
    clearDraft: () => void;
    deleteAndClearDraft: (
        getAccessToken: () => string,
        onTokenRefresh: (token: string) => void,
        onTokenClear: () => void
    ) => Promise<void>;
}

export const useDraftAutosave = ({
    form,
    type,
    initialDraftId = null,
    initialImageId = null,
    getAccessToken,
    onTokenRefresh,
    onTokenClear,
    onStatusChange,
}: UseDraftAutosaveOptions): UseDraftAutosaveResult => {
    const queryClient = useQueryClient();
    const [draftId, setDraftId] = useState<string | null>(initialDraftId);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);

    const draftIdRef = useRef<string | null>(initialDraftId);
    const uploadedImageIdRef = useRef<string | null>(initialImageId);
    const pendingFileRef = useRef<File | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);

    const getAccessTokenRef = useRef(getAccessToken);
    const onTokenRefreshRef = useRef(onTokenRefresh);
    const onTokenClearRef = useRef(onTokenClear);
    const onStatusChangeRef = useRef(onStatusChange);
    getAccessTokenRef.current = getAccessToken;
    onTokenRefreshRef.current = onTokenRefresh;
    onTokenClearRef.current = onTokenClear;
    onStatusChangeRef.current = onStatusChange;

    const clearDraft = useCallback(() => {
        setDraftId(null);
        draftIdRef.current = null;
        uploadedImageIdRef.current = null;
        pendingFileRef.current = null;
        onStatusChangeRef.current?.({ isSaving: false, saveError: false, hasDraft: false });
    }, []);

    const deleteAndClearDraft = useCallback(
        async (getAt: () => string, onRefresh: (token: string) => void, onClear: () => void) => {
            const id = draftIdRef.current;
            if (id) {
                await makeDeleteDraftRequest(id, getAt, onRefresh, onClear).catch(() => {});
            }
            queryClient.invalidateQueries({ queryKey: ['drafts', type] });
            clearDraft();
        },
        [clearDraft, queryClient, type]
    );

    const save = useCallback(
        async (values: Record<string, unknown>) => {
            if (isSavingRef.current) return;

            const name = (values.name as string) || '';
            if (!name.trim()) return;

            const imageValue = values.image;

            if (imageValue instanceof File && imageValue !== pendingFileRef.current) {
                pendingFileRef.current = imageValue;
                uploadedImageIdRef.current = null;
            } else if (!(imageValue instanceof File) && typeof imageValue !== 'string') {
                pendingFileRef.current = null;
            }

            const { image: _image, ...serializableData } = values;

            isSavingRef.current = true;
            setIsSaving(true);
            setSaveError(false);
            onStatusChangeRef.current?.({ isSaving: true, saveError: false, hasDraft: true });

            const authArgs = [getAccessTokenRef.current, onTokenRefreshRef.current, onTokenClearRef.current] as const;

            try {
                if (!draftIdRef.current) {
                    const draft = await makeCreateDraftRequest({ type, name, data: serializableData }, ...authArgs);
                    draftIdRef.current = draft.id;
                    setDraftId(draft.id);
                }

                if (pendingFileRef.current && !uploadedImageIdRef.current) {
                    const updated = await makeUploadDraftImageRequest(
                        draftIdRef.current!,
                        pendingFileRef.current,
                        ...authArgs
                    );
                    uploadedImageIdRef.current = updated.imageId ?? null;
                }

                await makeUpdateDraftRequest(
                    draftIdRef.current!,
                    {
                        name,
                        data: serializableData,
                        imageId: uploadedImageIdRef.current ?? undefined,
                    },
                    ...authArgs
                );
                onStatusChangeRef.current?.({ isSaving: false, saveError: false, hasDraft: true });
            } catch {
                setSaveError(true);
                onStatusChangeRef.current?.({ isSaving: false, saveError: true, hasDraft: !!draftIdRef.current });
            } finally {
                isSavingRef.current = false;
                setIsSaving(false);
            }
        },
        [type]
    );

    useEffect(() => {
        const subscription = form.watch((values) => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                save(values as Record<string, unknown>);
            }, DEBOUNCE_MS);
        });

        return () => {
            subscription.unsubscribe();
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [form.watch, save]);

    return {
        draftId,
        isSaving,
        saveError,
        uploadedImageId: uploadedImageIdRef.current,
        clearDraft,
        deleteAndClearDraft,
    };
};
