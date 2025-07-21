import { useCallback } from 'react';
import { MakeRequestProps } from '@jewellery-catalogue/types';
import { useAuth } from '../context/AuthContext';
import { makeRequestWithAutoRefresh } from '../api/makeRequest';

export const useApiRequest = () => {
    const { login, logout, accessToken } = useAuth();

    const makeRequest = useCallback(async <T>(
        requestProps: Omit<MakeRequestProps, 'accessToken'>
    ): Promise<T> => {
        if (!accessToken) {
            throw new Error('No access token available. Please log in.');
        }

        return makeRequestWithAutoRefresh<T>(
            { ...requestProps, accessToken },
            newToken => login(newToken),
            () => logout()
        );
    }, [accessToken, login, logout]);

    return { makeRequest };
};
