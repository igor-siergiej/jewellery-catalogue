import { Hono } from 'hono';
import { applicationRoutes } from './routes/application';
import { oauthRoutes } from './routes/oauth';
import type { MockStore } from './store';

export interface MockOptions {
    store: MockStore;
    publicUrl: string;
}

export const createEtsyMockApp = ({ store, publicUrl }: MockOptions) => {
    const app = new Hono();
    app.get('/health', (c) => c.json({ status: 'ok' }));
    app.route('/', oauthRoutes(store));
    app.route('/v3/application', applicationRoutes(store, publicUrl));
    return app;
};
