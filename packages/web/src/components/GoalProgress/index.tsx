import { useAuth } from '@imapps/web-utils';
import type { Goal } from '@jewellery-catalogue/types';
import { Heart, Pencil, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Progress } from '@/components/ui/progress';
import { GOAL_SOURCE_LABELS } from '@/lib/boardLabels';
import { cn } from '@/lib/utils';

import { makeSyncGoalEtsyValueRequest } from '../../api/endpoints/goals';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

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
    const sourceLabel = goal.source === 'manual' ? null : GOAL_SOURCE_LABELS[goal.source];

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
        // The whole card opens the editor for mouse users; the Edit button is the keyboard and screen reader route.
        <article
            aria-label={goal.title}
            onClick={() => onEdit(goal)}
            className="min-w-[240px] cursor-pointer rounded-lg border bg-card p-4 text-left"
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="min-w-0 break-words text-sm font-medium">{goal.title}</h3>
                <div className="-my-1 -mr-1 flex shrink-0 items-center">
                    <button
                        type="button"
                        aria-label={`Edit goal ${goal.title}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(goal);
                        }}
                        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:size-8"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        aria-label={goal.favourite ? 'Unfavourite goal' : 'Favourite goal'}
                        aria-pressed={!!goal.favourite}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavourite(goal.id);
                        }}
                        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:size-8"
                    >
                        <Heart className={cn('h-4 w-4', goal.favourite && 'fill-foreground text-foreground')} />
                    </button>
                </div>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
                {goal.currentValue}/{goal.targetValue}
                {goal.unit ? ` ${goal.unit}` : ''}
            </p>
            <Progress
                value={percent}
                aria-label={`${goal.title} progress`}
                className="bg-secondary [&>div]:bg-foreground"
            />
            {goal.targetDate && (
                <p className="mt-2 text-xs text-muted-foreground">
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                </p>
            )}
            {sourceLabel && (
                <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">{sourceLabel}</span>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSync();
                        }}
                        disabled={syncing}
                        className="-my-1 -mr-1 inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 md:size-8"
                        aria-label="Sync from Etsy"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}
        </article>
    );
};

export default GoalProgress;
