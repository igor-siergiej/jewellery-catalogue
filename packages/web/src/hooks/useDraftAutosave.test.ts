import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeCreateDraftRequest } from '../api/endpoints/drafts';
import { useDraftAutosave } from './useDraftAutosave';

vi.mock('../api/endpoints/drafts', () => ({
    makeCreateDraftRequest: vi.fn(),
    makeDeleteDraftRequest: vi.fn(),
    makeUpdateDraftRequest: vi.fn(),
    makeUploadDraftImageRequest: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

const mockCreate = vi.mocked(makeCreateDraftRequest);

describe('useDraftAutosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('does not create a new draft after clearDraft cancels the pending save', async () => {
        const { result: formResult } = renderHook(() => useForm({ defaultValues: { name: '', images: [] } }));

        const { result } = renderHook(() =>
            useDraftAutosave({
                form: formResult.current,
                type: 'design',
                getAccessToken: () => 'token',
                onTokenRefresh: vi.fn(),
                onTokenClear: vi.fn(),
            })
        );

        // Simulate user typing — triggers watch and queues debounce timer
        act(() => {
            formResult.current.setValue('name', 'Ring');
        });

        // clearDraft is called before 2s debounce fires (simulating submit clearing draft)
        act(() => {
            result.current.clearDraft();
        });

        // Advance time past debounce — if timer wasn't cancelled, save() would run
        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        expect(mockCreate).not.toHaveBeenCalled();
    });
});
