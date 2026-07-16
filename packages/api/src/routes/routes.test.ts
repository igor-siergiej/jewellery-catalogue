import { describe, expect, it } from 'bun:test';
import { createRoutes } from './index';

describe('routes', () => {
    it('rejects unauthenticated material requests with 401', async () => {
        const app = createRoutes();
        const res = await app.request('/api/materials');
        expect(res.status).toBe(401);
    });

    it('exposes health endpoint without auth', async () => {
        const app = createRoutes();
        const res = await app.request('/api/health');
        // 500 acceptable here (no DB in unit context); must not be 401/404
        expect([200, 500]).toContain(res.status);
    });
});
