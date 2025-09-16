import { AuthConfig } from '@igor-siergiej/web-utils';

import { getConfig } from '../loadConfig';

export const getAuthConfig = (): AuthConfig => {
    const config = getConfig();

    return {
        authUrl: config.AUTH_URL,
        storageType: 'localStorage',
        accessTokenKey: 'accessToken',
        refreshTokenCookieName: 'refreshToken',
        endpoints: {
            refresh: '/refresh',
            logout: '/logout'
        }
    };
};
