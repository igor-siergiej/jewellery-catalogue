import { useAuth } from '@imapps/web-utils';
import { type Goal, type GoalSource, goalSourceEnum } from '@jewellery-catalogue/types';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { makeUpdateGoalRequest } from '../../api/endpoints/goals';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const SOURCE_LABEL: Record<GoalSource, string> = {
    manual: 'Manual entry',
    etsy_active_listings: 'Etsy — Active listings',
    etsy_sales_count: 'Etsy — Total sales',
};

const EditGoalDialog: React.FC<{ goal: Goal | null; onOpenChange: (open: boolean) => void; onUpdated: () => void }> = ({
    goal,
    onOpenChange,
    onUpdated,
}) => {
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const [title, setTitle] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [unit, setUnit] = useState('');
    const [source, setSource] = useState<GoalSource>('manual');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!goal) return;
        setTitle(goal.title);
        setTargetValue(String(goal.targetValue));
        setCurrentValue(String(goal.currentValue));
        setUnit(goal.unit ?? '');
        setSource(goal.source);
    }, [goal]);

    const handleSubmit = async () => {
        if (!goal) return;

        const target = Number(targetValue);
        const current = Number(currentValue);
        if (!title.trim() || !target || target <= 0 || Number.isNaN(current) || current < 0) return;

        setSubmitting(true);
        try {
            await makeUpdateGoalRequest(
                goal.id,
                {
                    title: title.trim(),
                    targetValue: target,
                    currentValue: current,
                    unit: unit.trim() || undefined,
                    source,
                },
                () => accessToken,
                login,
                logout
            );
            onOpenChange(false);
            onUpdated();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during updating goal! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={!!goal} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Goal</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <Input placeholder="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Input
                        type="number"
                        placeholder="Target (e.g. 50)"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                    />
                    <Input
                        type="number"
                        placeholder="Current progress"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                    />
                    <Input
                        placeholder="Unit (optional, e.g. listings)"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                    />

                    <Select value={source} onValueChange={(v) => setSource(v as GoalSource)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Track from" />
                        </SelectTrigger>
                        <SelectContent>
                            {goalSourceEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {SOURCE_LABEL[opt]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !title.trim() || !targetValue || !(Number(targetValue) > 0)}
                    >
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditGoalDialog;
