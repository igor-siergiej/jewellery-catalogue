import { useAuth } from '@imapps/web-utils';
import { type Task, taskImportanceEnum, taskRecurrenceEnum, taskSubjectEnum } from '@jewellery-catalogue/types';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { makeUpdateTaskRequest } from '../../api/endpoints/tasks';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const EditTaskDialog: React.FC<{ task: Task | null; onOpenChange: (open: boolean) => void; onUpdated: () => void }> = ({
    task,
    onOpenChange,
    onUpdated,
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

    useEffect(() => {
        if (!task) return;
        setTitle(task.title);
        setSubject(task.subject);
        setImportance(task.importance);
        setRecurrence(task.recurrence);
        setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
        setDescription(task.description ?? '');
    }, [task]);

    const handleSubmit = async () => {
        if (!task) return;
        if (!title.trim()) return;

        setSubmitting(true);
        try {
            await makeUpdateTaskRequest(
                task.id,
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
            onOpenChange(false);
            onUpdated();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during updating task! :(',
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
        <Dialog open={!!task} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader className="pb-2">
                    <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="edit-task-title">Title</Label>
                        <Input
                            id="edit-task-title"
                            placeholder="Task title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-task-subject">Subject</Label>
                        <Select value={subject} onValueChange={(v) => setSubject(v as typeof subject)}>
                            <SelectTrigger id="edit-task-subject">
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-task-importance">Importance</Label>
                        <Select value={importance} onValueChange={(v) => setImportance(v as typeof importance)}>
                            <SelectTrigger id="edit-task-importance">
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-task-recurrence">Recurring</Label>
                        <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
                            <SelectTrigger id="edit-task-recurrence">
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
                    </div>

                    <div className="space-y-2">
                        <Label>Due date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal">
                                    {dueDate ? dueDate.toLocaleDateString() : 'Optional'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-task-description">Description</Label>
                        <Textarea
                            id="edit-task-description"
                            placeholder="Optional"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditTaskDialog;
