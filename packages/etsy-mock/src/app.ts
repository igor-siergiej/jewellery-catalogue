import { Hono } from 'hono';
import { type MockEnv, requireApiKey, requireToken } from './auth';
import { oauthRoutes } from './routes/oauth';
import type { MockStore } from './store';

export interface MockOptions {
    store: MockStore;
    publicUrl: string;
}

export const createEtsyMockApp = ({ store }: MockOptions) => {
    const app = new Hono<MockEnv>();
    app.get('/health', (c) => c.json({ status: 'ok' }));
    app.route('/', oauthRoutes(store));
    // Temporary until Task 3 adds the application routes.
    app.get('/v3/application/users/me', requireApiKey(), requireToken(store), (c) =>
        c.json({ user_id: c.get('etsyUserId') })
    );
    return app;
};
