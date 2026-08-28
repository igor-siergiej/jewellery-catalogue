import { useAuth } from '@imapps/web-utils';
import { type Goal, type GoalSource, goalSourceEnum } from '@jewellery-catalogue/types';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!goal) return;
        setTitle(goal.title);
        setTargetValue(String(goal.targetValue));
        setCurrentValue(String(goal.currentValue));
        setUnit(goal.unit ?? '');
        setSource(goal.source);
        setTargetDate(goal.targetDate ? new Date(goal.targetDate) : undefined);
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
                    targetDate,
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
                <DialogHeader className="pb-2">
                    <DialogTitle>Edit Goal</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="edit-goal-title">Title</Label>
                        <Input
                            id="edit-goal-title"
                            placeholder="Goal title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-goal-target">Target</Label>
                        <Input
                            id="edit-goal-target"
                            type="number"
                            placeholder="e.g. 50"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-goal-current">Current progress</Label>
                        <Input
                            id="edit-goal-current"
                            type="number"
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-goal-unit">Unit</Label>
                        <Input
                            id="edit-goal-unit"
                            placeholder="Optional, e.g. listings"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-goal-source">Track from</Label>
                        <Select value={source} onValueChange={(v) => setSource(v as GoalSource)}>
                            <SelectTrigger id="edit-goal-source">
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

                    <div className="space-y-2">
                        <Label>Target date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal">
                                    {targetDate ? targetDate.toLocaleDateString() : 'Optional'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={targetDate} onSelect={setTargetDate} />
                            </PopoverContent>
                        </Popover>
                    </div>
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
