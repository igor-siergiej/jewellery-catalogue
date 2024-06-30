export type State = {
    user: User | null;
};

export type User = {
    name: string;
    email: string;
};

export enum Actions {
    SET_USER = 'SET_USER',
}

export type StoreContext = {
    state: State;
    dispatch: (action: StoreAction) => void;
};

export type StoreAction = SetUserAction;

export type SetUserAction = {
    type: Actions.SET_USER;
    payload: User;
};
