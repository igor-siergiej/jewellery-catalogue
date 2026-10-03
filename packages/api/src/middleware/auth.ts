import type { Context, Next } from 'hono';

import { config } from '../config';

interface KivoVerifyResponse {
    success: boolean;
    payload?: {
        id: string;
        username: string;
    };
    message?: string;
}

type AuthVariables = { Variables: { userId: string } };

// Verifies a token with Kivo and stamps userId on the context. Returns an error response
// if verification fails or the token is missing, otherwise undefined to signal success.
const verifyKivoToken = async (
    c: Context<AuthVariables>,
    token: string | undefined,
    missingTokenMessage: string
): Promise<Response | undefined> => {
    if (!token) {
        return c.json({ error: missingTokenMessage }, 401);
    }

    try {
        const kivoUrl = config.get('authUrl');
        const originHeader = c.req.header('origin') || c.req.header('referer');
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
        };

        if (originHeader) {
            const origin = originHeader.includes('://') ? originHeader.split('/', 3).join('/') : originHeader;
            headers.Origin = origin;
        }

        const response = await fetch(`${kivoUrl}/verify`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            return c.json({ error: 'Invalid or expired token' }, 401);
        }

        const data = (await response.json()) as KivoVerifyResponse;

        if (!data.success || !data.payload) {
            return c.json({ error: 'Invalid token response' }, 401);
        }

        c.set('userId', data.payload.id);
        return undefined;
    } catch (error) {
        console.error('Authentication error:', error);
        return c.json({ error: 'Authentication service unavailable' }, 503);
    }
};

const bearerTokenFrom = (authHeader: string | undefined): string | undefined =>
    authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

export const authenticate = async (c: Context<AuthVariables>, next: Next) => {
    const error = await verifyKivoToken(
        c,
        bearerTokenFrom(c.req.header('authorization')),
        'Missing or invalid authorization header'
    );
    if (error) {
        return error;
    }
    await next();
};

// <img> requests can't set an Authorization header, so image routes also accept the token as a query param.
export const authenticateImageRequest = async (c: Context<AuthVariables>, next: Next) => {
    const error = await verifyKivoToken(
        c,
        bearerTokenFrom(c.req.header('authorization')) ?? c.req.query('token'),
        'Missing or invalid authorization'
    );
    if (error) {
        return error;
    }
    await next();
};
