import { useAuth } from '@imapps/web-utils';
import type { Task } from '@jewellery-catalogue/types';
import { useId, useState } from 'react';

import { makeUpdateTaskRequest } from '../../api/endpoints/tasks';
import { BoardFormDialog, useSaveSubmit } from '../BoardForm';
import TaskForm, { canSubmitTask, type TaskFormValues, taskToFormValues, taskToPayload } from './TaskForm';

const EditTaskDialog: React.FC<{ task: Task; onOpenChange: (open: boolean) => void; onUpdated: () => void }> = ({
    task,
    onOpenChange,
    onUpdated,
}) => {
    const formId = useId();
    const { accessToken, login, logout } = useAuth();
    const [values, setValues] = useState<TaskFormValues>(() => taskToFormValues(task));
    const { submitting, run } = useSaveSubmit("Couldn't save the task. Try again.");

    const handleSubmit = async () => {
        if (!canSubmitTask(values)) return;

        await run(async () => {
            await makeUpdateTaskRequest(task.id, taskToPayload(values), () => accessToken, login, logout);
            onOpenChange(false);
            onUpdated();
        });
    };

    return (
        <BoardFormDialog
            onOpenChange={onOpenChange}
            title="Edit task"
            description="Change this task's details."
            formId={formId}
            submitLabel="Save changes"
            submitDisabled={submitting || !canSubmitTask(values)}
        >
            <TaskForm formId={formId} values={values} onChange={setValues} onSubmit={handleSubmit} />
        </BoardFormDialog>
    );
};

export default EditTaskDialog;
