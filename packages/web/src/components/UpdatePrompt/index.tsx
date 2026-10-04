import { RefreshCw } from 'lucide-react';

import { usePWAContext } from '../../contexts/PWAContext';
import { Button } from '../ui/button';

const UpdatePrompt = () => {
    const { hasUpdate, isUpdating, updateApp, dismissUpdate } = usePWAContext();

    if (!hasUpdate) return null;

    return (
        <div
            role="status"
            className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-lg border bg-card p-3 shadow-lg"
        >
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm">A new version is available</span>
            <Button size="sm" onClick={updateApp} disabled={isUpdating}>
                Update
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissUpdate}>
                Later
            </Button>
        </div>
    );
};

export default UpdatePrompt;
