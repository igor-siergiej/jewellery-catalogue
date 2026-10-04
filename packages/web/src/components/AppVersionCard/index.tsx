import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { type UpdateCheckResult, usePWAContext } from '../../contexts/PWAContext';

const UPDATE_MESSAGES: Record<UpdateCheckResult, string> = {
    available: 'A new version is available.',
    latest: "You're on the latest version.",
    error: 'Could not check for updates. Try again when online.',
};

const AppVersionCard = () => {
    const { hasUpdate, isUpdating, isChecking, updateApp, checkForUpdate } = usePWAContext();
    const [result, setResult] = useState<UpdateCheckResult | null>(null);

    const handleCheck = async () => {
        setResult(await checkForUpdate());
    };

    const message = hasUpdate ? UPDATE_MESSAGES.available : result && UPDATE_MESSAGES[result];

    return (
        <Card>
            <CardHeader>
                <CardTitle>App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ && (
                    <p className="text-sm text-muted-foreground">Version {__APP_VERSION__}</p>
                )}
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleCheck} disabled={isChecking || isUpdating}>
                        {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Check for updates
                    </Button>
                    {hasUpdate && (
                        <Button onClick={updateApp} disabled={isUpdating}>
                            {isUpdating ? 'Updating…' : 'Update now'}
                        </Button>
                    )}
                </div>
                {message && (
                    <p role="status" className="text-sm">
                        {message}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default AppVersionCard;
