import { MakeRequestProps } from '@jewellery-catalogue/types';

import { withTokenRefresh } from '../../utils/tokenUtils';

export const origin = import.meta.env.VITE_API_URL;

// Base makeRequest function without token refresh logic
export const makeRequest = async <T>({
    pathname,
    method,
    operationString,
    headers,
    body,
    accessToken,
}: MakeRequestProps) => {
    const url = origin + pathname;
    const parsedBody = (body instanceof FormData) ? body : JSON.stringify(body);
    const encodedAccessToken = btoa(accessToken);

    const response = await fetch(url, {
        method: method,
        headers: {
            ...headers,
            Authorization: `Bearer ${encodedAccessToken}`,
        },
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
    return withTokenRefresh(
        () => makeRequest<T>(requestProps),
        onTokenRefresh,
        onTokenClear
    );
};
