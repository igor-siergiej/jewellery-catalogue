import { useAuth } from '@imapps/web-utils';
import { type GoalSource, goalSourceEnum } from '@jewellery-catalogue/types';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { makeCreateGoalRequest } from '../../api/endpoints/goals';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const SOURCE_LABEL: Record<GoalSource, string> = {
    manual: 'Manual entry',
    etsy_active_listings: 'Etsy — Active listings',
    etsy_sales_count: 'Etsy — Total sales',
};

const AddGoalDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }> = ({
    open,
    onOpenChange,
    onCreated,
}) => {
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const [title, setTitle] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [unit, setUnit] = useState('');
    const [source, setSource] = useState<GoalSource>('manual');
    const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
    const [submitting, setSubmitting] = useState(false);

    const reset = () => {
        setTitle('');
        setTargetValue('');
        setUnit('');
        setSource('manual');
        setTargetDate(undefined);
    };

    const handleSubmit = async () => {
        const target = Number(targetValue);
        if (!title.trim() || !target || target <= 0) return;

        setSubmitting(true);
        try {
            await makeCreateGoalRequest(
                { title: title.trim(), targetValue: target, unit: unit.trim() || undefined, source, targetDate },
                () => accessToken,
                login,
                logout
            );
            reset();
            onOpenChange(false);
            onCreated();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during creating goal! :(',
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Goal</DialogTitle>
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

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal">
                                {targetDate ? targetDate.toLocaleDateString() : 'Target date (optional)'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={targetDate} onSelect={setTargetDate} />
                        </PopoverContent>
                    </Popover>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !title.trim() || !targetValue || !(Number(targetValue) > 0)}
                    >
                        Add Goal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddGoalDialog;
