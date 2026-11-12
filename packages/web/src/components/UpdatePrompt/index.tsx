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
                        A new version is ready. Updating reloads the app, so finish and save any changes first.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button
                        variant="outline"
                        className="min-h-11 md:min-h-9"
                        onClick={dismissUpdate}
                        disabled={isUpdating}
                    >
                        Later
                    </Button>
                    <Button className="min-h-11 md:min-h-9" onClick={updateApp} disabled={isUpdating}>
                        {isUpdating ? 'Updating…' : 'Update now'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default UpdatePrompt;
