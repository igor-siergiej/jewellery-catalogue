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

import { DESIGNS_IMPORT_COMMIT_ENDPOINT, DESIGNS_IMPORT_PREVIEW_ENDPOINT } from '../../endpoints';
import { makeCommitImportRequest, makePreviewImportRequest } from './index';

const noop = () => {};
const token = () => 'tok';

describe('importDesigns requests', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('posts CSV as multipart to preview endpoint', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    candidates: [],
                    invalid: [],
                    summary: { new: 0, changed: 0, same: 0, invalid: 0 },
                }),
                { status: 200 }
            )
        );
        const file = new File(['TITLE\nx'], 'export.csv', { type: 'text/csv' });
        const res = await makePreviewImportRequest(file, token, noop, noop);
        expect(res.summary.new).toBe(0);
        expect(fetchSpy.mock.calls[0][0]).toBe(DESIGNS_IMPORT_PREVIEW_ENDPOINT);
        const [, init] = fetchSpy.mock.calls[0];
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(FormData);
    });

    it('posts JSON to commit endpoint', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(JSON.stringify({ created: 1, updated: 0, failed: [] }), { status: 200 }));
        const res = await makeCommitImportRequest({ candidates: [] }, token, noop, noop);
        expect(res.created).toBe(1);
        expect(fetchSpy.mock.calls[0][0]).toBe(DESIGNS_IMPORT_COMMIT_ENDPOINT);
        const [, init] = fetchSpy.mock.calls[0];
        expect(init?.method).toBe('POST');
        expect(init?.body).not.toBeInstanceOf(FormData);
        expect(JSON.parse(init?.body as string)).toEqual({ candidates: [] });
    });
});
