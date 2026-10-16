import { getStorageItem, withTokenRefresh } from '@imapps/web-utils';
import type { MakeRequestProps } from '@jewellery-catalogue/types';

import { getAuthConfig } from '../../utils/authConfig';
import { logger } from '../../utils/logger';

export const makeRequest = async <T>({
    pathname,
    method,
    operationString,
    headers,
    body,
    accessToken,
}: MakeRequestProps) => {
    const parsedBody = body instanceof FormData ? body : JSON.stringify(body);

    const requestHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    };

    if (!(body instanceof FormData)) {
        Object.assign(requestHeaders, headers);
    }

    const response = await fetch(pathname, {
        method: method,
        headers: requestHeaders,
        body: body ? parsedBody : undefined,
    });

    if (response.ok) {
        return (await response.json()) as T;
    } else {
        // 401s are expected: withTokenRefresh refreshes the token and retries.
        if (response.status !== 401) {
            logger[response.status >= 500 ? 'error' : 'warn'](`Failed to ${operationString}`, {
                method,
                pathname,
                status: response.status,
            });
        }
        throw new Error(`Response was not ok ${response.status}: ${response.statusText}`);
    }
};

export const makeRequestWithAutoRefresh = async <T>(
    requestProps: MakeRequestProps,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const config = getAuthConfig();

    const getLatestToken = () => {
        const storedToken = getStorageItem(config.accessTokenKey!, config.storageType);
        return storedToken || getAccessToken();
    };

    return withTokenRefresh(
        () => makeRequest<T>({ ...requestProps, accessToken: getLatestToken() }),
        onTokenRefresh,
        onTokenClear,
        config
    );
};
