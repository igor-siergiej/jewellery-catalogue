import { useAuth } from '@imapps/web-utils';
import type { Goal } from '@jewellery-catalogue/types';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Progress } from '@/components/ui/progress';

import { makeSyncGoalEtsyValueRequest } from '../../api/endpoints/goals';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const SOURCE_LABEL: Record<Goal['source'], string | null> = {
    manual: null,
    etsy_active_listings: 'Etsy · Active listings',
    etsy_sales_count: 'Etsy · Total sales',
};

const GoalProgress: React.FC<{ goal: Goal; onSynced: () => void }> = ({ goal, onSynced }) => {
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const [syncing, setSyncing] = useState(false);
    const percent = goal.targetValue > 0 ? Math.min(100, (goal.currentValue / goal.targetValue) * 100) : 0;
    const sourceLabel = SOURCE_LABEL[goal.source];

    const handleSync = async () => {
        setSyncing(true);
        try {
            await makeSyncGoalEtsyValueRequest(goal.id, () => accessToken, login, logout);
            onSynced();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during syncing goal from Etsy! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="rounded-md border bg-card p-3 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{goal.title}</span>
                <span className="text-xs text-muted-foreground">
                    {goal.currentValue}/{goal.targetValue}
                    {goal.unit ? ` ${goal.unit}` : ''}
                </span>
            </div>
            <Progress value={percent} />
            {sourceLabel && (
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{sourceLabel}</span>
                    <button
                        type="button"
                        onClick={handleSync}
                        disabled={syncing}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                        aria-label="Sync from Etsy"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default GoalProgress;
