import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../utils/loadConfig', () => ({
    getConfig: vi.fn(() => ({
        AUTH_URL: 'http://localhost:3000',
    })),
    loadConfig: vi.fn(),
    getAuthUrl: vi.fn(),
}));

vi.mock('@imapps/web-utils', () => ({
    getStorageItem: vi.fn(() => null),
    withTokenRefresh: vi.fn((fn) => fn()),
}));

import { DESIGNS_IMPORT_RUNS_ENDPOINT } from '../../endpoints';
import { makeCancelImportRunRequest, makeGetImportRunRequest, makeGetImportRunsRequest } from './index';

const noop = () => {};
const token = () => 'tok';

const run = { id: 'run-1', status: 'running', processed: 1, total: 3 };

describe('importRuns requests', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('gets the run list', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(JSON.stringify([run]), { status: 200 }));
        const res = await makeGetImportRunsRequest(token, noop, noop);
        expect(res[0].id).toBe('run-1');
        expect(fetchSpy.mock.calls[0][0]).toBe(DESIGNS_IMPORT_RUNS_ENDPOINT);
        expect(fetchSpy.mock.calls[0][1]?.method).toBe('GET');
    });

    it('gets a single run by id', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(JSON.stringify(run), { status: 200 }));
        const res = await makeGetImportRunRequest('run-1', token, noop, noop);
        expect(res.id).toBe('run-1');
        expect(fetchSpy.mock.calls[0][0]).toBe(`${DESIGNS_IMPORT_RUNS_ENDPOINT}/run-1`);
    });

    it('posts to the cancel endpoint', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(JSON.stringify({ ...run, cancelRequested: true }), { status: 200 }));
        const res = await makeCancelImportRunRequest('run-1', token, noop, noop);
        expect(res.cancelRequested).toBe(true);
        expect(fetchSpy.mock.calls[0][0]).toBe(`${DESIGNS_IMPORT_RUNS_ENDPOINT}/run-1/cancel`);
        expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
});
