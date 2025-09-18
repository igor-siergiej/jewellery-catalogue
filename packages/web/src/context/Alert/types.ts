// Using string literals instead of MUI AlertColor
type AlertColor = 'success' | 'info' | 'warning' | 'error';

export interface AlertState {
    open?: boolean;
    title: string;
    message: string;
    severity: AlertColor;
    variant?: 'filled' | 'outlined' | 'standard';
    duration?: number;
}

export enum AlertStoreActions {
    SHOW_ALERT = 'SHOW_ALERT',
    HIDE_ALERT = 'HIDE_ALERT'
}

export interface StoreContext {
    state: AlertState;
    dispatch: (action: ShowAlert) => void;
}

export type AlertStoreAction = ShowAlert | HideAlert;

export interface ShowAlert {
    type: AlertStoreActions.SHOW_ALERT;
    payload: AlertState;
}

export interface HideAlert {
    type: AlertStoreActions.HIDE_ALERT;
    payload: AlertState;
}
