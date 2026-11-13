import { useAuth } from '@imapps/web-utils';
import type { Goal } from '@jewellery-catalogue/types';
import { useId, useState } from 'react';

import { makeUpdateGoalRequest } from '../../api/endpoints/goals';
import { BoardFormDialog, useSaveSubmit } from '../BoardForm';
import GoalForm, { canSubmitGoal, type GoalFormValues, goalToFormValues, goalToPayload } from './GoalForm';

const EditGoalDialog: React.FC<{ goal: Goal; onOpenChange: (open: boolean) => void; onUpdated: () => void }> = ({
    goal,
    onOpenChange,
    onUpdated,
}) => {
    const formId = useId();
    const { accessToken, login, logout } = useAuth();
    const [values, setValues] = useState<GoalFormValues>(() => goalToFormValues(goal));
    const { submitting, run } = useSaveSubmit("Couldn't save the goal. Try again.");

    const handleSubmit = async () => {
        const target = Number(values.targetValue);
        const current = Number(values.currentValue);

        if (!values.title.trim() || !target || target <= 0 || Number.isNaN(current) || current < 0) return;

        await run(async () => {
            await makeUpdateGoalRequest(
                goal.id,
                { ...goalToPayload(values, target), currentValue: current },
                () => accessToken,
                login,
                logout
            );
            onOpenChange(false);
            onUpdated();
        });
    };

    return (
        <BoardFormDialog
            onOpenChange={onOpenChange}
            title="Edit goal"
            description="Change this goal's target and progress."
            formId={formId}
            submitLabel="Save changes"
            submitDisabled={submitting || !canSubmitGoal(values)}
        >
            <GoalForm formId={formId} mode="edit" values={values} onChange={setValues} onSubmit={handleSubmit} />
        </BoardFormDialog>
    );
};

export default EditGoalDialog;
