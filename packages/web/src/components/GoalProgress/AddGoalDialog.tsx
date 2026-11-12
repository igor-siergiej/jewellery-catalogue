import { useAuth } from '@imapps/web-utils';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';

import { makeCreateGoalRequest } from '../../api/endpoints/goals';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { ResponsiveDialog } from '../ResponsiveDialog';
import GoalForm, { canSubmitGoal, EMPTY_GOAL_VALUES, type GoalFormValues } from './GoalForm';

const AddGoalDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }> = ({
    open,
    onOpenChange,
    onCreated,
}) => {
    const formId = useId();
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const [values, setValues] = useState<GoalFormValues>(EMPTY_GOAL_VALUES);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const target = Number(values.targetValue);

        if (!values.title.trim() || !target || target <= 0) return;

        setSubmitting(true);

        try {
            await makeCreateGoalRequest(
                {
                    title: values.title.trim(),
                    targetValue: target,
                    unit: values.unit.trim() || undefined,
                    source: values.source,
                    targetDate: values.targetDate,
                },
                () => accessToken,
                login,
                logout
            );
            setValues(EMPTY_GOAL_VALUES);
            onOpenChange(false);
            onCreated();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: "Couldn't create the goal. Try again.",
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
            open={open}
            onOpenChange={onOpenChange}
            title="Add goal"
            description="Set a target to work towards."
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 md:min-h-9"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form={formId}
                        className="min-h-11 md:min-h-9"
                        disabled={submitting || !canSubmitGoal(values)}
                    >
                        Add goal
                    </Button>
                </>
            }
        >
            <GoalForm formId={formId} mode="add" values={values} onChange={setValues} onSubmit={handleSubmit} />
        </ResponsiveDialog>
    );
};

export default AddGoalDialog;
