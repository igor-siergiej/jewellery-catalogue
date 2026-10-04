import { useRegisterSW } from 'virtual:pwa-register/react';
import type React from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

interface PWAContextType {
    hasUpdate: boolean;
    isUpdating: boolean;
    updateApp: () => void;
    dismissUpdate: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWAContext = () => {
    const context = useContext(PWAContext);

    if (context === undefined) {
        throw new Error('usePWAContext must be used within a PWAProvider');
    }

    return context;
};

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasUpdate, setHasUpdate] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

    const { updateServiceWorker } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;

            registrationRef.current = registration;

            const checkForUpdate = () => {
                if (!registration.installing && navigator.onLine) {
                    void registration.update();
                }
            };

            setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    checkForUpdate();
                }
            });
        },
        onNeedRefresh() {
            setHasUpdate(true);
        },
    });

    const updateApp = useCallback(() => {
        setIsUpdating(true);
        void updateServiceWorker(true);
    }, [updateServiceWorker]);

    const dismissUpdate = useCallback(() => setHasUpdate(false), []);

    return (
        <PWAContext.Provider value={{ hasUpdate, isUpdating, updateApp, dismissUpdate }}>
            {children}
        </PWAContext.Provider>
    );
};
