import { useAuth } from '@imapps/web-utils';
import { useId, useState } from 'react';

import { makeCreateTaskRequest } from '../../api/endpoints/tasks';
import { BoardFormDialog, useSaveSubmit } from '../BoardForm';
import TaskForm, { canSubmitTask, EMPTY_TASK_VALUES, type TaskFormValues, taskToPayload } from './TaskForm';

const AddTaskDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }> = ({
    open,
    onOpenChange,
    onCreated,
}) => {
    const formId = useId();
    const { accessToken, login, logout } = useAuth();
    const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK_VALUES);
    const { submitting, run } = useSaveSubmit("Couldn't create the task. Try again.");

    const handleSubmit = async () => {
        if (!canSubmitTask(values)) return;

        await run(async () => {
            await makeCreateTaskRequest(taskToPayload(values), () => accessToken, login, logout);
            setValues(EMPTY_TASK_VALUES);
            onOpenChange(false);
            onCreated();
        });
    };

    return (
        <BoardFormDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Add task"
            description="Add something to your board."
            formId={formId}
            submitLabel="Add task"
            submitDisabled={submitting || !canSubmitTask(values)}
        >
            <TaskForm formId={formId} values={values} onChange={setValues} onSubmit={handleSubmit} />
        </BoardFormDialog>
    );
};

export default AddTaskDialog;
