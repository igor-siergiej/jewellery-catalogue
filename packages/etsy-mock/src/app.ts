import { Hono } from 'hono';
import { html } from 'hono/html';
import { applicationRoutes } from './routes/application';
import { controlRoutes, faultInjection } from './routes/control';
import { dashboardRoutes } from './routes/dashboard';
import { oauthRoutes } from './routes/oauth';
import type { MockStore } from './store';

export interface MockOptions {
    store: MockStore;
    publicUrl: string;
}

export const createEtsyMockApp = ({ store, publicUrl }: MockOptions) => {
    const app = new Hono();
    app.get('/health', (c) => c.json({ status: 'ok' }));
    app.use('/v3/*', faultInjection(store));
    app.route('/', oauthRoutes(store));
    app.route('/', dashboardRoutes(store));
    app.route('/v3/application', applicationRoutes(store, publicUrl));
    app.route('/__mock', controlRoutes(store, publicUrl));
    app.get('/images/:imageId', (c) => {
        const id = Number(c.req.param('imageId'));
        const image = [...store.listings.values()].flatMap((l) => l.images).find((i) => i.imageId === id);
        if (!image) return c.notFound();
        return c.body(image.bytes, 200, { 'Content-Type': image.contentType });
    });
    app.get('/listing/:listingId', (c) => {
        const listing = store.listings.get(Number(c.req.param('listingId')));
        if (!listing) return c.notFound();
        return c.html(html`<h1>${listing.title}</h1><p>Mock Etsy listing ${listing.listingId} (${listing.state})</p>`);
    });
    return app;
};
