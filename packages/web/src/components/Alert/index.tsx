import { X } from 'lucide-react';

import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';

export const GlobalAlert: React.FC = () => {
    const { state, dispatch } = useAlert();
    const onClose = () => {
        dispatch({
            type: AlertStoreActions.HIDE_ALERT,
            payload: {
                title: state.title,
                message: state.message,
                severity: state.severity,
                variant: state.variant
            }
        });
    };
    if (!state.open) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 min-w-[500px] shadow-lg">
            <Alert className={`relative ${state.severity === 'error' ? 'border-destructive bg-destructive/10' : 'border-primary bg-primary/10'}`}>
                <AlertTitle className="flex items-center justify-between">
                    <span>{state.title}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-6 w-6 p-0 hover:bg-transparent"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </AlertTitle>
                <AlertDescription>
                    {state.message}
                </AlertDescription>
            </Alert>
        </div>
    );
};
