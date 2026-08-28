import { useAuth } from '@imapps/web-utils';
import type { Goal } from '@jewellery-catalogue/types';
import { Heart, RefreshCw } from 'lucide-react';
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

const GoalProgress: React.FC<{
    goal: Goal;
    onSynced: () => void;
    onEdit: (goal: Goal) => void;
    onToggleFavourite: (goalId: string) => void;
}> = ({ goal, onSynced, onEdit, onToggleFavourite }) => {
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
        <div
            role="button"
            tabIndex={0}
            onClick={() => onEdit(goal)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onEdit(goal);
            }}
            aria-label={`Edit goal ${goal.title}`}
            className="rounded-md border bg-card p-4 min-w-[220px] text-left cursor-pointer"
        >
            <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-sm font-medium">{goal.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {goal.currentValue}/{goal.targetValue}
                        {goal.unit ? ` ${goal.unit}` : ''}
                    </span>
                    <button
                        type="button"
                        aria-label={goal.favourite ? 'Unfavourite goal' : 'Favourite goal'}
                        aria-pressed={!!goal.favourite}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavourite(goal.id);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Heart className={`h-4 w-4 ${goal.favourite ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                </div>
            </div>
            <Progress value={percent} />
            {goal.targetDate && (
                <p className="text-xs text-muted-foreground mt-2">
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                </p>
            )}
            {sourceLabel && (
                <div className="flex items-center justify-between gap-4 mt-3">
                    <span className="text-xs text-muted-foreground">{sourceLabel}</span>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSync();
                        }}
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
