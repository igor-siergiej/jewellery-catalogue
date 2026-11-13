import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { ResponsiveDialog } from '../ResponsiveDialog';

export const Field = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        {children}
    </div>
);

export const useFormSet =
    <T,>(values: T, onChange: (values: T) => void) =>
    <K extends keyof T>(key: K, value: T[K]) =>
        onChange({ ...values, [key]: value });

/** The `<form>` wrapper shared by the board dialogs. The dialog owns the values and the submit. */
export const BoardFormShell: React.FC<{
    formId: string;
    onSubmit: () => void;
    children: React.ReactNode;
}> = ({ formId, onSubmit, children }) => {
    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
            {children}
        </form>
    );
};

export const TitleField: React.FC<{
    formId: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}> = ({ formId, placeholder, value, onChange }) => (
    <Field id={`${formId}-title`} label="Title">
        <Input
            id={`${formId}-title`}
            required
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </Field>
);

export const DateField: React.FC<{
    id: string;
    label: string;
    value: Date | undefined;
    onChange: (value: Date | undefined) => void;
}> = ({ id, label, value, onChange }) => (
    <Field id={id} label={label}>
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full justify-start font-normal md:min-h-9"
                >
                    {value ? value.toLocaleDateString() : 'Optional'}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={value} onSelect={onChange} />
            </PopoverContent>
        </Popover>
    </Field>
);

/** Runs a save, tracking the submitting flag and showing an error alert if it throws. */
export const useSaveSubmit = (errorTitle: string) => {
    const { dispatch } = useAlert();
    const [submitting, setSubmitting] = useState(false);

    const run = async (save: () => Promise<void>) => {
        setSubmitting(true);

        try {
            await save();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: errorTitle,
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setSubmitting(false);
        }
    };

    return { submitting, run };
};

export const BoardFormDialog: React.FC<{
    open?: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    formId: string;
    submitLabel: string;
    submitDisabled: boolean;
    children: React.ReactNode;
}> = ({ open = true, onOpenChange, title, description, formId, submitLabel, submitDisabled, children }) => (
    <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
            <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button type="submit" form={formId} disabled={submitDisabled}>
                    {submitLabel}
                </Button>
            </>
        }
    >
        {children}
    </ResponsiveDialog>
);
