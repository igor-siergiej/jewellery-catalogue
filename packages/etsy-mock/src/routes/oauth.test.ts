import { beforeEach, describe, expect, it } from 'bun:test';
import { createHash, randomBytes } from 'node:crypto';
import { createEtsyMockApp } from '../app';
import { MockStore } from '../store';

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const REDIRECT = 'http://localhost:3001/api/etsy/oauth/callback';
const API_KEY = { 'x-api-key': 'key:secret' };

let store: MockStore;
let app: ReturnType<typeof createEtsyMockApp>;

beforeEach(() => {
    store = new MockStore();
    app = createEtsyMockApp({ store, publicUrl: 'http://mock' });
});

const authorizeQuery = (challenge: string, scope = 'listings_r listings_w shops_r transactions_r email_r') =>
    new URLSearchParams({
        response_type: 'code',
        client_id: 'key',
        redirect_uri: REDIRECT,
        scope,
        state: 'st4te',
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });

async function approveNewShop(shopName: string, scope?: string) {
    const verifier = b64url(randomBytes(32));
    const challenge = b64url(createHash('sha256').update(verifier).digest());
    const form = new URLSearchParams(authorizeQuery(challenge, scope));
    form.set('decision', 'allow');
    form.set('account', 'new');
    form.set('shop_name', shopName);
    form.set('scenario', 'established');
    const res = await app.request('/oauth/connect', { method: 'POST', body: form });
    const location = new URL(res.headers.get('location') as string);
    return { res, location, verifier };
}

async function exchange(code: string, verifier: string) {
    return app.request('/v3/public/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: 'key',
            redirect_uri: REDIRECT,
            code,
            code_verifier: verifier,
        }).toString(),
    });
}

describe('GET /oauth/connect', () => {
    it('renders a consent page listing existing shops', async () => {
        store.createUser({ shopName: 'Existing Shop', scenario: 'empty' });
        const res = await app.request(`/oauth/connect?${authorizeQuery('abc')}`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Existing Shop');
        expect(html).toContain('Allow access');
    });

    it('rejects a request without PKCE', async () => {
        const q = authorizeQuery('abc');
        q.delete('code_challenge');
        const res = await app.request(`/oauth/connect?${q}`);
        expect(res.status).toBe(400);
    });
});

describe('POST /oauth/connect', () => {
    it('redirects back with code and state, creating a new shop', async () => {
        const { res, location } = await approveNewShop('Bead Shop');
        expect(res.status).toBe(302);
        expect(location.origin + location.pathname).toBe(REDIRECT);
        expect(location.searchParams.get('state')).toBe('st4te');
        expect(location.searchParams.get('code')).toBeTruthy();
        expect([...store.shops.values()].map((s) => s.shopName)).toContain('Bead Shop');
    });

    it('creates a separate shop on each new-shop approval', async () => {
        await approveNewShop('A');
        await approveNewShop('B');
        expect(store.shops.size).toBe(2);
    });

    it('redirects with access_denied when denied', async () => {
        const form = new URLSearchParams(authorizeQuery('abc'));
        form.set('decision', 'deny');
        const res = await app.request('/oauth/connect', { method: 'POST', body: form });
        const location = new URL(res.headers.get('location') as string);
        expect(location.searchParams.get('error')).toBe('access_denied');
        expect(location.searchParams.get('state')).toBe('st4te');
    });
});

describe('POST /v3/public/oauth/token', () => {
    it('exchanges a code for tokens when the PKCE verifier matches', async () => {
        const { location, verifier } = await approveNewShop('Bead Shop');
        const res = await exchange(location.searchParams.get('code') as string, verifier);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.token_type).toBe('Bearer');
        expect(body.expires_in).toBe(3600);
        expect(body.access_token).toMatch(/^\d+\./);
        expect(body.refresh_token).toBeTruthy();
    });

    it('rejects a wrong verifier and a reused code', async () => {
        const { location, verifier } = await approveNewShop('Bead Shop');
        const code = location.searchParams.get('code') as string;
        expect((await exchange(code, 'wrong')).status).toBe(400);
        expect((await exchange(code, verifier)).status).toBe(400);
    });

    it('rotates both tokens on refresh and invalidates the old access token', async () => {
        const { location, verifier } = await approveNewShop('Bead Shop');
        const first = await (await exchange(location.searchParams.get('code') as string, verifier)).json();
        const res = await app.request('/v3/public/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: 'key',
                refresh_token: first.refresh_token,
            }).toString(),
        });
        const second = await res.json();
        expect(second.access_token).not.toBe(first.access_token);
        expect(second.refresh_token).not.toBe(first.refresh_token);

        const old = await app.request('/v3/application/users/me', {
            headers: { ...API_KEY, Authorization: `Bearer ${first.access_token}` },
        });
        expect(old.status).toBe(401);
    });
});
