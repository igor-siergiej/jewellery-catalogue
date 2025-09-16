import { withTokenRefresh } from '@igor-siergiej/web-utils';
import { MakeRequestProps } from '@jewellery-catalogue/types';

import { getAuthConfig } from '../../utils/authConfig';

export const makeRequest = async <T>({
    pathname,
    method,
    operationString,
    headers,
    body,
    accessToken,
}: MakeRequestProps) => {
    const parsedBody = (body instanceof FormData) ? body : JSON.stringify(body);
    const encodedAccessToken = btoa(accessToken);

    // When using FormData, don't set Content-Type header - let browser set it automatically
    const requestHeaders: Record<string, string> = {
        Authorization: `Bearer ${encodedAccessToken}`,
    };

    // Only add other headers if not using FormData (to avoid Content-Type conflicts)
    if (!(body instanceof FormData)) {
        Object.assign(requestHeaders, headers);
    }

    const response = await fetch(pathname, {
        method: method,
        headers: requestHeaders,
        body: body ? parsedBody : undefined
    });

    if (response.ok) {
        return await response.json() as T;
    } else {
        console.error(
            `Failed to ${operationString}:`,
            response.status,
            response.statusText
        );
        throw new Error(
            `Response was not ok ${response.status}: ${response.statusText}`
        );
    }
};

// Higher-order function that wraps makeRequest with automatic token refresh
export const makeRequestWithAutoRefresh = async <T>(
    requestProps: MakeRequestProps,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const config = getAuthConfig();
    return withTokenRefresh(
        () => makeRequest<T>(requestProps),
        onTokenRefresh,
        onTokenClear,
        config
    );
};
