import type { EtsyConnectionStatus } from '@jewellery-catalogue/types';
import { MethodType } from '@jewellery-catalogue/types';

import { ETSY_CONNECTION_ENDPOINT, ETSY_OAUTH_START_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGetEtsyConnectionStatusRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyConnectionStatus>(
        {
            pathname: ETSY_CONNECTION_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch etsy connection status',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeStartEtsyOAuthRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<{ url: string }>(
        {
            pathname: ETSY_OAUTH_START_ENDPOINT,
            method: MethodType.GET,
            operationString: 'start etsy oauth',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeDisconnectEtsyRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<null>(
        {
            pathname: ETSY_CONNECTION_ENDPOINT,
            method: MethodType.DELETE,
            operationString: 'disconnect etsy',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
