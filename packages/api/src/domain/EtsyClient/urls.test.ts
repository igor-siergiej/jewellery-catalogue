import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { EtsyClient, etsyUrls } from '.';

afterEach(() => mock.restore());

describe('etsyUrls', () => {
    it('defaults to real Etsy', () => {
        expect(etsyUrls()).toEqual({
            authorize: 'https://www.etsy.com/oauth/connect',
            token: 'https://api.etsy.com/v3/public/oauth/token',
            apiBase: 'https://api.etsy.com/v3/application',
        });
    });

    it('points every URL at the mock when given one, ignoring a trailing slash', () => {
        expect(etsyUrls('http://localhost:3010/')).toEqual({
            authorize: 'http://localhost:3010/oauth/connect',
            token: 'http://localhost:3010/v3/public/oauth/token',
            apiBase: 'http://localhost:3010/v3/application',
        });
    });
});

describe('EtsyClient with mock URLs', () => {
    const client = new EtsyClient('key', 'secret', etsyUrls('http://localhost:3010'));

    it('builds the authorisation URL on the mock', () => {
        const url = new URL(
            client.buildAuthorizationUrl({ redirectUri: 'r', state: 's', codeChallenge: 'c', scope: 'x' })
        );
        expect(url.origin + url.pathname).toBe('http://localhost:3010/oauth/connect');
    });

    it('sends API and token calls to the mock', async () => {
        const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
            (async () =>
                new Response(
                    JSON.stringify({ user_id: 1, shop_id: 2, access_token: 'a', refresh_token: 'b', expires_in: 1 })
                )) as never
        );
        await client.getMe('token');
        await client.refreshAccessToken('refresh');
        expect(String(fetchSpy.mock.calls[0][0])).toBe('http://localhost:3010/v3/application/users/me');
        expect(String(fetchSpy.mock.calls[1][0])).toBe('http://localhost:3010/v3/public/oauth/token');
    });
});
