import { useAuth, useAuthConfig } from '@imapps/web-utils';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { HOME_PAGE } from '@/constants/routes';
import { useAlert } from '@/context/Alert';
import { AlertStoreActions } from '@/context/Alert/types';

type AuthFields = {
    username: string;
    password: string;
};

export function useAuthSubmit(endpoint: string, errorTitle: string) {
    const [isLoading, setIsLoading] = useState(false);
    const { dispatch } = useAlert();
    const navigate = useNavigate();
    const { login } = useAuth();
    const config = useAuthConfig();

    // fallow-ignore-next-line complexity
    const onSubmit = async (data: AuthFields) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${config.authUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include',
            });

            if (!response.ok) {
                const json = await response.json();

                throw new Error(json.message);
            }

            const json = await response.json();

            if (!json.accessToken) throw new Error('No access token returned');
            flushSync(() => login(json.accessToken));
            navigate(HOME_PAGE.route);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: errorTitle,
                    message,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    return { isLoading, onSubmit };
}
