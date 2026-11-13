import type React from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useRestoreFocus } from '@/hooks/useRestoreFocus';

interface DeleteConfirmDialogProps {
    /** The item being deleted; null keeps the dialog closed. */
    name: string | null;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
    name,
    description,
    onConfirm,
    onCancel,
    isDeleting = false,
}) => {
    const restoreFocus = useRestoreFocus(name !== null);

    return (
        <AlertDialog open={name !== null} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent onCloseAutoFocus={restoreFocus}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{name ?? ''}"?</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className={buttonVariants({ variant: 'destructive' })}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
