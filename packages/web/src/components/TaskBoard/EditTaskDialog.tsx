import { useAuth } from '@imapps/web-utils';
import type { Task } from '@jewellery-catalogue/types';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';

import { makeUpdateTaskRequest } from '../../api/endpoints/tasks';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { ResponsiveDialog } from '../ResponsiveDialog';
import TaskForm, { canSubmitTask, type TaskFormValues, taskToFormValues } from './TaskForm';

const EditTaskDialog: React.FC<{ task: Task; onOpenChange: (open: boolean) => void; onUpdated: () => void }> = ({
    task,
    onOpenChange,
    onUpdated,
}) => {
    const formId = useId();
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const [values, setValues] = useState<TaskFormValues>(() => taskToFormValues(task));
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!canSubmitTask(values)) return;

        setSubmitting(true);

        try {
            await makeUpdateTaskRequest(
                task.id,
                {
                    title: values.title.trim(),
                    subject: values.subject,
                    importance: values.importance,
                    recurrence: values.recurrence,
                    dueDate: values.dueDate,
                    description: values.description.trim() || undefined,
                    checklist: values.checklist,
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
                    title: "Couldn't save the task. Try again.",
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
            title="Edit task"
            description="Change this task's details."
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} disabled={submitting || !canSubmitTask(values)}>
                        Save changes
                    </Button>
                </>
            }
        >
            <TaskForm formId={formId} values={values} onChange={setValues} onSubmit={handleSubmit} />
        </ResponsiveDialog>
    );
};

export default EditTaskDialog;
