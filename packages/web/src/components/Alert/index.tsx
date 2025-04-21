import { Alert, AlertTitle, Box, Collapse } from '@mui/material';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

export const GlobalAlert: React.FC = () => {
    const { state, dispatch } = useAlert();
    const onClose = () => {
        console.log(state);
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
    return (
        <Box sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1300,
            minWidth: 500,
            boxShadow: 3,
        }}
        >
            <Collapse sx={{ zIndex: 10 }} in={state.open}>
                <Alert
                    variant={state.variant}
                    severity={state.severity}
                    onClose={onClose}
                >
                    <AlertTitle>
                        {state.title}
                    </AlertTitle>
                    {state.message}
                </Alert>
            </Collapse>
        </Box>
    );
};
