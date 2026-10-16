import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ token: 'token-1' as string | null }));

vi.mock('@imapps/web-utils', () => ({ getStorageItem: () => storage.token }));
vi.mock('../authConfig', () => ({
    getAuthConfig: () => ({ accessTokenKey: 'accessToken', storageType: 'localStorage' }),
}));

const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

// The logger keeps its queue and budget in module state, so each test gets a fresh copy.
const loadLogger = async () => {
    vi.resetModules();
    return import('.');
};

const sentBatches = () =>
    fetchMock.mock.calls.map(([, init]) => {
        const { body, headers, keepalive } = init as RequestInit;
        return { logs: JSON.parse(body as string).logs, headers, keepalive };
    });

describe('frontend logger', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockClear();
        storage.token = 'token-1';
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('sends a full batch at once and the rest after the flush delay, with the access token', async () => {
        const { logger } = await loadLogger();

        for (let i = 0; i < 23; i++) logger.error(`line ${i}`);
        expect(sentBatches()).toHaveLength(1);
        expect(sentBatches()[0].logs).toHaveLength(20);

        vi.advanceTimersByTime(5000);
        const batches = sentBatches();
        expect(batches).toHaveLength(2);
        expect(batches[1].logs.map((l: { message: string }) => l.message)).toEqual(['line 20', 'line 21', 'line 22']);
        expect(batches[1].headers).toMatchObject({ Authorization: 'Bearer token-1' });
    });

    it('drops lines when nobody is logged in', async () => {
        storage.token = null;
        const { logger } = await loadLogger();

        logger.warn('before login');
        vi.advanceTimersByTime(5000);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('stops at 120 lines a minute and starts again in the next minute', async () => {
        const { logger } = await loadLogger();

        for (let i = 0; i < 130; i++) logger.error('loop');
        vi.advanceTimersByTime(5000);
        expect(sentBatches().flatMap((b) => b.logs)).toHaveLength(120);

        vi.advanceTimersByTime(60_000);
        logger.error('next minute');
        vi.advanceTimersByTime(5000);
        expect(sentBatches().flatMap((b) => b.logs)).toHaveLength(121);
    });

    it('logs unhandled rejections and flushes with keepalive when the page is hidden', async () => {
        const { installGlobalErrorLogging } = await loadLogger();
        installGlobalErrorLogging();

        const rejection = new Event('unhandledrejection') as PromiseRejectionEvent;
        Object.assign(rejection, { reason: new Error('lost promise') });
        window.dispatchEvent(rejection);
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        const [batch] = sentBatches();
        expect(batch.keepalive).toBe(true);
        expect(batch.logs[0]).toMatchObject({
            level: 'error',
            message: 'Unhandled promise rejection',
            context: { error: 'lost promise', name: 'Error' },
        });
    });
});
