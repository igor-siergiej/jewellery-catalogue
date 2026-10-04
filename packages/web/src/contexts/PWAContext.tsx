import { useRegisterSW } from 'virtual:pwa-register/react';
import type React from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export type UpdateCheckResult = 'available' | 'latest' | 'error';

interface PWAContextType {
    hasUpdate: boolean;
    isUpdating: boolean;
    isChecking: boolean;
    updateApp: () => void;
    dismissUpdate: () => void;
    checkForUpdate: () => Promise<UpdateCheckResult>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWAContext = () => {
    const context = useContext(PWAContext);

    if (context === undefined) {
        throw new Error('usePWAContext must be used within a PWAProvider');
    }

    return context;
};

const waitForInstall = (worker: ServiceWorker) =>
    new Promise<boolean>((resolve) => {
        const onChange = () => {
            if (worker.state === 'installed') {
                worker.removeEventListener('statechange', onChange);
                resolve(true);
            } else if (worker.state === 'redundant') {
                worker.removeEventListener('statechange', onChange);
                resolve(false);
            }
        };

        worker.addEventListener('statechange', onChange);
        onChange();
    });

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasUpdate, setHasUpdate] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

    const { updateServiceWorker } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;

            registrationRef.current = registration;

            const checkInBackground = () => {
                if (!registration.installing && navigator.onLine) {
                    void registration.update();
                }
            };

            setInterval(checkInBackground, UPDATE_CHECK_INTERVAL_MS);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    checkInBackground();
                }
            });
        },
        onNeedRefresh() {
            setHasUpdate(true);
        },
    });

    const checkForUpdate = useCallback(async (): Promise<UpdateCheckResult> => {
        const registration = registrationRef.current;

        if (!registration || !navigator.onLine) return 'error';

        setIsChecking(true);

        try {
            await registration.update();

            if (registration.waiting) {
                setHasUpdate(true);

                return 'available';
            }

            if (registration.installing && (await waitForInstall(registration.installing))) {
                setHasUpdate(true);

                return 'available';
            }

            return 'latest';
        } catch {
            return 'error';
        } finally {
            setIsChecking(false);
        }
    }, []);

    const updateApp = useCallback(() => {
        setIsUpdating(true);
        void updateServiceWorker(true);
    }, [updateServiceWorker]);

    const dismissUpdate = useCallback(() => setHasUpdate(false), []);

    return (
        <PWAContext.Provider value={{ hasUpdate, isUpdating, isChecking, updateApp, dismissUpdate, checkForUpdate }}>
            {children}
        </PWAContext.Provider>
    );
};
