import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

interface DraftStatusState {
    isSaving: boolean;
    saveError: boolean;
    hasDraft: boolean;
}

interface DraftStatusContextValue {
    status: DraftStatusState;
    setDraftStatus: (status: DraftStatusState) => void;
    clearDraftStatus: () => void;
}

const initial: DraftStatusState = { isSaving: false, saveError: false, hasDraft: false };

const DraftStatusContext = createContext<DraftStatusContextValue>({
    status: initial,
    setDraftStatus: () => {},
    clearDraftStatus: () => {},
});

export const DraftStatusProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<DraftStatusState>(initial);

    const setDraftStatus = useCallback((next: DraftStatusState) => {
        setStatus(next);
    }, []);

    const clearDraftStatus = useCallback(() => {
        setStatus(initial);
    }, []);

    return (
        <DraftStatusContext.Provider value={{ status, setDraftStatus, clearDraftStatus }}>
            {children}
        </DraftStatusContext.Provider>
    );
};

export const useDraftStatus = () => useContext(DraftStatusContext);
