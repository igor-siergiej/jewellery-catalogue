import type { MiddlewareHandler } from 'hono';
import type { MockStore } from './store';

export type MockEnv = { Variables: { etsyUserId: number } };

export const requireApiKey = (): MiddlewareHandler => async (c, next) => {
    if (!/^[^:]+:[^:]+$/.test(c.req.header('x-api-key') ?? '')) {
        return c.json({ error: 'Invalid API key: expected keystring:shared_secret' }, 403);
    }
    await next();
};

export const requireToken =
    (store: MockStore, scope?: string): MiddlewareHandler<MockEnv> =>
    async (c, next) => {
        const raw = (c.req.header('authorization') ?? '').replace(/^Bearer /, '');
        const token = store.tokens.get(raw);
        if (!token || token.expiresAt <= store.now()) return c.json({ error: 'invalid_token' }, 401);
        if (scope && !token.scopes.includes(scope)) return c.json({ error: `Missing scope: ${scope}` }, 403);
        c.set('etsyUserId', token.userId);
        await next();
    };
