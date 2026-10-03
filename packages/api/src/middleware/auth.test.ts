import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { Context } from 'hono';

import '../test-setup';
import { authenticate, authenticateImageRequest } from './auth';

type AuthVars = { Variables: { userId: string } };

const createMockContext = (
    headers: Record<string, string> = {},
    requestHeaders: Record<string, string> = {}
): Context<AuthVars> => {
    const allHeaders = { ...headers, ...requestHeaders };
    const req = new Request('http://localhost/', {
        headers: allHeaders,
    });

    const ctx = {
        req: {
            header: (name: string) => allHeaders[name.toLowerCase()] ?? allHeaders[name],
            raw: req,
        },
        json: vi.fn().mockImplementation(
            (body, status) =>
                new Response(JSON.stringify(body), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                })
        ),
        set: vi.fn(),
        get: vi.fn(),
    } as unknown as Context<AuthVars>;

    return ctx;
};

const mockNext = vi.fn().mockResolvedValue(undefined);

describe('authenticate middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('When Authorization header is missing', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({});

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Missing or invalid authorization header' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe("When Authorization header does not start with 'Bearer '", () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ authorization: 'Basic abc123' });

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Missing or invalid authorization header' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo returns a non-OK response', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ authorization: 'Bearer expired-token' });
            global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Invalid or expired token' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo response has success: false', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ authorization: 'Bearer token' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ success: false }),
            }) as unknown as typeof fetch;

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Invalid token response' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo response has no payload', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ authorization: 'Bearer token' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ success: true, payload: null }),
            }) as unknown as typeof fetch;

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Invalid token response' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When token is valid', () => {
        it('should set userId on context and call next()', async () => {
            const ctx = createMockContext({ authorization: 'Bearer valid-token' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'user-1', username: 'alice' },
                }),
            }) as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(ctx.set).toHaveBeenCalledWith('userId', 'user-1');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should call Kivo /verify with the Authorization header', async () => {
            const ctx = createMockContext({ authorization: 'Bearer my-token' });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'user-1', username: 'alice' },
                }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3008/verify',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
                })
            );
        });
    });

    describe('When fetch throws a network error', () => {
        it('should return 503', async () => {
            const ctx = createMockContext({ authorization: 'Bearer token' });
            global.fetch = vi.fn().mockRejectedValue(new Error('Network failure')) as unknown as typeof fetch;

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(503);
            expect(await result?.json()).toEqual({ error: 'Authentication service unavailable' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When an Origin header is present in the request', () => {
        it('should forward the Origin header to Kivo', async () => {
            const ctx = createMockContext(
                { authorization: 'Bearer token' },
                { origin: 'https://jewellerycatalogue.imapps.co.uk' }
            );
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'u1', username: 'bob' },
                }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({ Origin: 'https://jewellerycatalogue.imapps.co.uk' }),
                })
            );
        });
    });

    describe('When a Referer header is present (but no Origin)', () => {
        it('should extract and forward the origin from the referer', async () => {
            const ctx = createMockContext(
                { authorization: 'Bearer token' },
                { referer: 'https://jewellerycatalogue.imapps.co.uk/some/page' }
            );
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'u1', username: 'bob' },
                }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({ Origin: 'https://jewellerycatalogue.imapps.co.uk' }),
                })
            );
        });
    });
});

describe('authenticateImageRequest middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createCtxWithQuery = (headers: Record<string, string>, query: Record<string, string | undefined>) => {
        const allHeaders = { ...headers };
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(query)) {
            if (v !== undefined) search.set(k, v);
        }
        const url = `http://localhost/${search.toString() ? `?${search.toString()}` : ''}`;
        const req = new Request(url, { headers: allHeaders });
        return {
            req: {
                header: (name: string) => allHeaders[name.toLowerCase()] ?? allHeaders[name],
                query: (name: string) => query[name],
                raw: req,
            },
            json: vi.fn().mockImplementation(
                (body, status) =>
                    new Response(JSON.stringify(body), {
                        status,
                        headers: { 'Content-Type': 'application/json' },
                    })
            ),
            set: vi.fn(),
            get: vi.fn(),
        } as unknown as Context<AuthVars>;
    };

    const stubKivo = (response: { ok: boolean; body: unknown } | Error) => {
        if (response instanceof Error) {
            global.fetch = vi.fn().mockRejectedValue(response) as unknown as typeof fetch;
            return;
        }
        global.fetch = vi.fn().mockResolvedValue({
            ok: response.ok,
            json: vi.fn().mockResolvedValue(response.body),
        }) as unknown as typeof fetch;
    };

    describe('When neither Authorization header nor ?token is present', () => {
        it('returns 401', async () => {
            const ctx = createCtxWithQuery({}, { token: undefined });

            const result = await authenticateImageRequest(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Missing or invalid authorization' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When ?token query param is present and valid', () => {
        it('sets userId and calls next', async () => {
            const ctx = createCtxWithQuery({}, { token: 'query-token' });
            stubKivo({ ok: true, body: { success: true, payload: { id: 'user-1', username: 'alice' } } });

            await authenticateImageRequest(ctx, mockNext);

            expect(ctx.set).toHaveBeenCalledWith('userId', 'user-1');
            expect(mockNext).toHaveBeenCalled();
        });

        it('forwards the query token to Kivo as a Bearer token', async () => {
            const ctx = createCtxWithQuery({}, { token: 'query-token' });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ success: true, payload: { id: 'u', username: 'u' } }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticateImageRequest(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3008/verify',
                expect.objectContaining({
                    headers: expect.objectContaining({ Authorization: 'Bearer query-token' }),
                })
            );
        });
    });

    describe('When Authorization Bearer header is present and valid', () => {
        it('sets userId and calls next (header takes precedence over ?token)', async () => {
            const ctx = createCtxWithQuery({ authorization: 'Bearer header-token' }, { token: 'query-token' });
            stubKivo({ ok: true, body: { success: true, payload: { id: 'user-1', username: 'alice' } } });

            await authenticateImageRequest(ctx, mockNext);

            expect(ctx.set).toHaveBeenCalledWith('userId', 'user-1');
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('When Kivo returns 401', () => {
        it('returns 401', async () => {
            const ctx = createCtxWithQuery({}, { token: 'bad' });
            stubKivo({ ok: false, body: {} });

            const result = await authenticateImageRequest(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When fetch throws', () => {
        it('returns 503', async () => {
            const ctx = createCtxWithQuery({}, { token: 'any' });
            stubKivo(new Error('Network failure'));

            const result = await authenticateImageRequest(ctx, mockNext);

            expect(result?.status).toBe(503);
            expect(await result?.json()).toEqual({ error: 'Authentication service unavailable' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
