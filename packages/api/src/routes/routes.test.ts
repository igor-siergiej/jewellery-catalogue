import { beforeAll, describe, expect, it } from 'bun:test';

import { Logger } from '@imapps/api-utils';

import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import { createRoutes } from './index';

describe('routes', () => {
    // The auth middleware resolves the Logger, so register it here rather than
    // relying on another test file having left one in the shared container.
    beforeAll(() => {
        if (!dependencyContainer.isTokenRegistered(DependencyToken.Logger)) {
            dependencyContainer.registerSingleton(DependencyToken.Logger, Logger);
        }
    });

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
