import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Logger } from '@imapps/api-utils';
import { createApp } from '@imapps/api-utils/hono';
import type { Hono } from 'hono';

import { createReceiveLogs, MAX_LOG_LINES_PER_MINUTE, MAX_LOGS_PER_BATCH } from '.';

const logger = { info: mock(), warn: mock(), error: mock(), debug: mock() };
let clock = 0;

const buildApp = () => {
    const receiveLogs = createReceiveLogs({ logger: () => logger as unknown as Logger, now: () => clock });
    const app = createApp({ logger: logger as unknown as Logger, allowedOrigins: [] });
    app.use('*', async (c, next) => {
        c.set('userId' as never, (c.req.header('x-test-user') ?? 'user-1') as never);
        await next();
    });
    app.post('/api/logs', receiveLogs);
    return app;
};

const line = (level = 'error', message = 'boom') => ({ level, message });

const send = (app: Hono, body: unknown, user = 'user-1') =>
    app.request('/api/logs', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'test-agent', 'x-test-user': user },
        body: JSON.stringify(body),
    });

describe('receiveLogs', () => {
    beforeEach(() => {
        for (const m of Object.values(logger)) m.mockClear();
        clock = 0;
    });

    it('writes each line at its level, stamped with the authenticated user', async () => {
        const res = await send(buildApp(), {
            logs: [
                { level: 'warn', message: 'slow', url: 'https://app/designs', context: { ms: 900 } },
                { level: 'error', message: 'boom', context: { userId: 'spoofed', source: 'spoofed' } },
            ],
        });

        expect(res.status).toBe(204);
        expect(logger.warn).toHaveBeenCalledWith('slow', {
            ms: 900,
            url: 'https://app/designs',
            clientTimestamp: undefined,
            source: 'frontend',
            userId: 'user-1',
            userAgent: 'test-agent',
        });
        expect(logger.error).toHaveBeenCalledWith(
            'boom',
            expect.objectContaining({ source: 'frontend', userId: 'user-1' })
        );
    });

    it.each([
        ['an unknown level', { logs: [line('debug')] }],
        ['an empty batch', { logs: [] }],
        ['an oversized batch', { logs: Array.from({ length: MAX_LOGS_PER_BATCH + 1 }, () => line()) }],
        ['an oversized context', { logs: [{ ...line(), context: { blob: 'x'.repeat(5000) } }] }],
        ['a non-object body', 'nope'],
    ])('rejects %s with 400 and logs nothing', async (_name, body) => {
        const res = await send(buildApp(), body);
        for (const m of Object.values(logger)) {
            expect(m).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ source: 'frontend' }));
        }
        expect(res.status).toBe(400);
    });

    it('caps lines per user per minute, then resets', async () => {
        const app = buildApp();
        const fullBatch = { logs: Array.from({ length: MAX_LOGS_PER_BATCH }, () => line()) };
        for (let sent = 0; sent < MAX_LOG_LINES_PER_MINUTE; sent += MAX_LOGS_PER_BATCH) {
            expect((await send(app, fullBatch)).status).toBe(204);
        }

        expect((await send(app, { logs: [line()] })).status).toBe(429);
        expect((await send(app, { logs: [line()] }, 'user-2')).status).toBe(204);

        clock = 60_000;
        expect((await send(app, { logs: [line()] })).status).toBe(204);
    });
});
