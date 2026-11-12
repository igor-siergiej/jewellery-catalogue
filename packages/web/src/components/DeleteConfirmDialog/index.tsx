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
}) => (
    <AlertDialog open={name !== null} onOpenChange={(open) => !open && onCancel()}>
        <AlertDialogContent>
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
