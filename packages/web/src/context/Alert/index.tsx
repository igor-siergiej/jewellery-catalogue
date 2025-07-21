/* eslint-disable @typescript-eslint/no-empty-function */
import { createContext, ReactNode, useContext, useReducer, useRef } from 'react';

import { AlertState, AlertStoreAction, AlertStoreActions } from './types';

const DEFAULT_DURATION = 10_000;

const initialState: AlertState = {
    open: false,
    title: '',
    message: '',
    severity: 'info',
    variant: 'standard'
};

const { SHOW_ALERT, HIDE_ALERT } = AlertStoreActions;

const AlertContext = createContext<{
    state: AlertState;
    dispatch: React.Dispatch<AlertStoreAction>;
}>({
    state: initialState,
    dispatch: () => { },
});

export const alertReducer = (state: AlertState, action: AlertStoreAction): AlertState => {
    switch (action.type) {
        case SHOW_ALERT:
            return {
                open: true,
                message: action.payload.message,
                severity: action.payload.severity,
                variant: action.payload?.variant,
                title: action.payload.title
            };
        case HIDE_ALERT:
            return {
                open: false,
                message: action.payload.message,
                severity: action.payload.severity,
                variant: action.payload?.variant,
                title: action.payload.title
            };
        default:
            return state;
    }
};

export interface StoreProviderProps {
    children: ReactNode;
}

export const AlertProvider = (props: StoreProviderProps) => {
    const [state, dispatch] = useReducer(alertReducer, initialState);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const alertDispatch = (action: AlertStoreAction) => {
        if (action.type === HIDE_ALERT) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            dispatch(action);
        } else if (action.type === SHOW_ALERT) {
            dispatch(action);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            const duration = action.payload.duration ?? DEFAULT_DURATION;

            timeoutRef.current = setTimeout(() => {
                dispatch({
                    type: HIDE_ALERT,
                    payload: { ...action.payload, open: false },
                });
            }, duration);
        }
    };

    return (
        <AlertContext.Provider value={{ state, dispatch: alertDispatch }}>
            {props.children}
        </AlertContext.Provider>
    );
};

export const useAlert = () => useContext(AlertContext);
