import { useAuth } from '@imapps/web-utils';
import type { Goal } from '@jewellery-catalogue/types';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';

import { makeUpdateGoalRequest } from '../../api/endpoints/goals';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { ResponsiveDialog } from '../ResponsiveDialog';
import GoalForm, { canSubmitGoal, type GoalFormValues, goalToFormValues } from './GoalForm';

const EditGoalDialog: React.FC<{ goal: Goal; onOpenChange: (open: boolean) => void; onUpdated: () => void }> = ({
    goal,
    onOpenChange,
    onUpdated,
}) => {
    const formId = useId();
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const [values, setValues] = useState<GoalFormValues>(() => goalToFormValues(goal));
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const target = Number(values.targetValue);
        const current = Number(values.currentValue);

        if (!values.title.trim() || !target || target <= 0 || Number.isNaN(current) || current < 0) return;

        setSubmitting(true);

        try {
            await makeUpdateGoalRequest(
                goal.id,
                {
                    title: values.title.trim(),
                    targetValue: target,
                    currentValue: current,
                    unit: values.unit.trim() || undefined,
                    source: values.source,
                    targetDate: values.targetDate,
                },
                () => accessToken,
                login,
                logout
            );
            onOpenChange(false);
            onUpdated();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: "Couldn't save the goal. Try again.",
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
        <ResponsiveDialog
            open
            onOpenChange={onOpenChange}
            title="Edit goal"
            description="Change this goal's target and progress."
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} disabled={submitting || !canSubmitGoal(values)}>
                        Save changes
                    </Button>
                </>
            }
        >
            <GoalForm formId={formId} mode="edit" values={values} onChange={setValues} onSubmit={handleSubmit} />
        </ResponsiveDialog>
    );
};

export default EditGoalDialog;
