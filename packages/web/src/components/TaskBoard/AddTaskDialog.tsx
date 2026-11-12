import { useAuth } from '@imapps/web-utils';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';

import { makeCreateTaskRequest } from '../../api/endpoints/tasks';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { ResponsiveDialog } from '../ResponsiveDialog';
import TaskForm, { canSubmitTask, EMPTY_TASK_VALUES, type TaskFormValues } from './TaskForm';

const AddTaskDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }> = ({
    open,
    onOpenChange,
    onCreated,
}) => {
    const formId = useId();
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK_VALUES);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!canSubmitTask(values)) return;

        setSubmitting(true);

        try {
            await makeCreateTaskRequest(
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
            setValues(EMPTY_TASK_VALUES);
            onOpenChange(false);
            onCreated();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: "Couldn't create the task. Try again.",
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
            title="Add task"
            description="Add something to your board."
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
                        disabled={submitting || !canSubmitTask(values)}
                    >
                        Add task
                    </Button>
                </>
            }
        >
            <TaskForm formId={formId} values={values} onChange={setValues} onSubmit={handleSubmit} />
        </ResponsiveDialog>
    );
};

export default AddTaskDialog;
