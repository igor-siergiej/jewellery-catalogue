export interface State {
    user: User | null;
}

export interface User {
    firstName: string;
    lastName: string;
    email: string;
}

export enum Actions {
    SET_USER = 'SET_USER',
}

export interface StoreContext {
    state: State;
    dispatch: (action: StoreAction) => void;
}

export type StoreAction = SetUserAction;

export interface SetUserAction {
    type: Actions.SET_USER;
    payload: User;
}
