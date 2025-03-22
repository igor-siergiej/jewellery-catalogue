import { ReactNode, createContext, useReducer } from 'react';
import { Actions, State, StoreAction, StoreContext } from './types';

const initialState: State = {
    user: null,
};

const { SET_USER } = Actions;

export const Store = createContext({} as StoreContext);

export const storeReducer = (state: State, action: StoreAction): State => {
    switch (action.type) {
        case SET_USER:
            return {
                ...state,
                user: action.payload,
            };
        default:
            return state;
    }
};

export interface StoreProviderProps {
    children: ReactNode;
}

export const StoreProvider = (props: StoreProviderProps) => {
    const [state, dispatch] = useReducer(storeReducer, initialState);
    return (
        <Store.Provider value={{ state, dispatch }}>
            {props.children}
        </Store.Provider>
    );
};
