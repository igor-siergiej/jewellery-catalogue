import { useAuth } from '@imapps/web-utils';
import { taskImportanceEnum, taskRecurrenceEnum, taskSubjectEnum } from '@jewellery-catalogue/types';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { makeCreateTaskRequest } from '../../api/endpoints/tasks';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const AddTaskDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }> = ({
    open,
    onOpenChange,
    onCreated,
}) => {
    const { accessToken, login, logout } = useAuth();
    const { dispatch } = useAlert();
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState<(typeof taskSubjectEnum.options)[number]>('product');
    const [importance, setImportance] = useState<(typeof taskImportanceEnum.options)[number]>('medium');
    const [recurrence, setRecurrence] = useState<(typeof taskRecurrenceEnum.options)[number]>('none');
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const reset = () => {
        setTitle('');
        setSubject('product');
        setImportance('medium');
        setRecurrence('none');
        setDueDate(undefined);
        setDescription('');
    };

    const handleSubmit = async () => {
        if (!title.trim()) return;

        setSubmitting(true);
        try {
            await makeCreateTaskRequest(
                {
                    title: title.trim(),
                    subject,
                    importance,
                    recurrence,
                    dueDate,
                    description: description.trim() || undefined,
                },
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
                    title: 'Error occured during creating task! :(',
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
                    <DialogTitle>Add Task</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />

                    <Select value={subject} onValueChange={(v) => setSubject(v as typeof subject)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {taskSubjectEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="capitalize">
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={importance} onValueChange={(v) => setImportance(v as typeof importance)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Importance" />
                        </SelectTrigger>
                        <SelectContent>
                            {taskImportanceEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="capitalize">
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Recurring" />
                        </SelectTrigger>
                        <SelectContent>
                            {taskRecurrenceEnum.options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="capitalize">
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal">
                                {dueDate ? dueDate.toLocaleDateString() : 'Due date (optional)'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                        </PopoverContent>
                    </Popover>

                    <Textarea
                        placeholder="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
                        Add Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddTaskDialog;
