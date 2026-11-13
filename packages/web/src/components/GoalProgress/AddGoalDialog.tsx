import { useAuth } from '@imapps/web-utils';
import { useId, useState } from 'react';

import { makeCreateGoalRequest } from '../../api/endpoints/goals';
import { BoardFormDialog, useSaveSubmit } from '../BoardForm';
import GoalForm, { canSubmitGoal, EMPTY_GOAL_VALUES, type GoalFormValues, goalToPayload } from './GoalForm';

const AddGoalDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }> = ({
    open,
    onOpenChange,
    onCreated,
}) => {
    const formId = useId();
    const { accessToken, login, logout } = useAuth();
    const [values, setValues] = useState<GoalFormValues>(EMPTY_GOAL_VALUES);
    const { submitting, run } = useSaveSubmit("Couldn't create the goal. Try again.");

    const handleSubmit = async () => {
        const target = Number(values.targetValue);

        if (!values.title.trim() || !target || target <= 0) return;

        await run(async () => {
            await makeCreateGoalRequest(goalToPayload(values, target), () => accessToken, login, logout);
            setValues(EMPTY_GOAL_VALUES);
            onOpenChange(false);
            onCreated();
        });
    };

    return (
        <BoardFormDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Add goal"
            description="Set a target to work towards."
            formId={formId}
            submitLabel="Add goal"
            submitDisabled={submitting || !canSubmitGoal(values)}
        >
            <GoalForm formId={formId} mode="add" values={values} onChange={setValues} onSubmit={handleSubmit} />
        </BoardFormDialog>
    );
};

export default AddGoalDialog;
