import { usePWAContext } from '../../contexts/PWAContext';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';

const UpdatePrompt = () => {
    const { hasUpdate, isUpdating, updateApp, dismissUpdate } = usePWAContext();

    return (
        <AlertDialog open={hasUpdate}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Update available</AlertDialogTitle>
                    <AlertDialogDescription>
                        A new version is ready. The app will reload; unsaved changes will be lost.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="ghost" onClick={dismissUpdate} disabled={isUpdating}>
                        Later
                    </Button>
                    <Button onClick={updateApp} disabled={isUpdating}>
                        {isUpdating ? 'Updating…' : 'Update now'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default UpdatePrompt;
