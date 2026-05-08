import { MethodType, type UserSettings } from '@jewellery-catalogue/types';

import { RECALCULATE_PRICES_ENDPOINT, USER_SETTINGS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGetUserSettingsRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<UserSettings>(
        {
            pathname: USER_SETTINGS_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch user settings',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeUpdateUserSettingsRequest = (
    updates: { hourlyWage: number; profitMargin: number },
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<UserSettings>(
        {
            pathname: USER_SETTINGS_ENDPOINT,
            method: MethodType.PUT,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'update user settings',
            body: updates,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeRecalculatePricesRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<{ updated: number; total: number }>(
        {
            pathname: RECALCULATE_PRICES_ENDPOINT,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'recalculate prices',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
