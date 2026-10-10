import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Logger } from '@imapps/api-utils';
import { APIError, createApp } from '@imapps/api-utils/hono';

import type { AiUsageRepository } from '../domain/AiUsageRepository';
import { createAiUsageMiddleware } from './aiUsage';

const NOW = Date.UTC(2026, 9, 10, 12);
const logger = { info: mock(), warn: mock(), error: mock(), debug: mock() };
const repo = { record: mock(async () => {}), countSince: mock(async () => 0) };
const handler = mock(async () => ({ ok: true }));

const buildApp = () => {
    const aiUsage = createAiUsageMiddleware({
        repo: () => repo as unknown as AiUsageRepository,
        logger: () => logger as unknown as Logger,
        limits: () => ({ perHour: 3, perDay: 10 }),
        model: () => 'test-model',
        now: () => NOW,
    });
    const app = createApp({ logger: logger as unknown as Logger, allowedOrigins: [] });
    app.use('*', async (c, next) => {
        c.set('userId' as never, 'user-1' as never);
        await next();
    });
    app.post('/ai', aiUsage('test.feature'), async (c) => c.json(await handler()));
    return app;
};

describe('AI usage middleware', () => {
    beforeEach(() => {
        for (const m of [...Object.values(logger), ...Object.values(repo), handler]) m.mockClear();
        repo.countSince.mockImplementation(async () => 0);
        repo.record.mockImplementation(async () => {});
        handler.mockImplementation(async () => ({ ok: true }));
    });

    it('lets a call through under the limits and records it', async () => {
        const res = await buildApp().request('/ai', { method: 'POST' });

        expect(res.status).toBe(200);
        expect(repo.countSince).toHaveBeenCalledWith('user-1', new Date(NOW - 60 * 60 * 1000));
        expect(repo.countSince).toHaveBeenCalledWith('user-1', new Date(NOW - 24 * 60 * 60 * 1000));
        expect(repo.record).toHaveBeenCalledWith({
            userId: 'user-1',
            feature: 'test.feature',
            model: 'test-model',
            latencyMs: 0,
            success: true,
            status: 200,
            at: new Date(NOW),
        });
    });

    it('returns 429 without calling the model once the hourly limit is used up', async () => {
        repo.countSince.mockImplementation(async () => 3);

        const res = await buildApp().request('/ai', { method: 'POST' });

        expect(res.status).toBe(429);
        expect(JSON.stringify(await res.json())).toContain('3 requests per hour');
        expect(handler).not.toHaveBeenCalled();
        expect(repo.record).not.toHaveBeenCalled();
    });

    it('applies the daily limit too', async () => {
        repo.countSince.mockImplementation(async (_user: string, since: Date) =>
            since.getTime() === NOW - 60 * 60 * 1000 ? 0 : 10
        );

        const res = await buildApp().request('/ai', { method: 'POST' });

        expect(res.status).toBe(429);
        expect(JSON.stringify(await res.json())).toContain('10 requests per day');
    });

    it('records a failed call as unsuccessful, with its status', async () => {
        handler.mockImplementation(async () => {
            throw new APIError('fal.ai error 500', 502);
        });

        const res = await buildApp().request('/ai', { method: 'POST' });

        expect(res.status).toBe(502);
        expect(repo.record).toHaveBeenCalledWith(expect.objectContaining({ success: false, status: 502 }));
    });

    it('still answers when recording the usage fails', async () => {
        repo.record.mockImplementation(async () => {
            throw new Error('mongo down');
        });

        const res = await buildApp().request('/ai', { method: 'POST' });

        expect(res.status).toBe(200);
        expect(logger.error).toHaveBeenCalled();
    });
});
