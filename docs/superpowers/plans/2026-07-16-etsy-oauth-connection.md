# Etsy OAuth Connection (Sub-project 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Mari connect her Etsy shop to the catalogue app once (OAuth 2.0 authorization-code + PKCE), with the backend holding and auto-refreshing tokens forever after — the foundation sub-project of `docs/superpowers/specs/2026-07-16-etsy-api-integration-design.md`. No listing push, no pricing/template settings — those are later sub-projects.

**Architecture:** Standard layered pattern already used in this repo: `types` (zod schema) → `domain` (repository interface + `EtsyClient` HTTP wrapper + `EtsyConnectionService` + in-memory `EtsyOAuthStateStore`) → `infrastructure` (`MongoEtsyConnectionRepository`) → `handlers` (Hono) → `routes`. Web side mirrors the existing `useUserSettings` pattern: typed endpoint functions using `makeRequestWithAutoRefresh`, a `useEtsyConnection` react-query hook, and a new `/settings` page that replaces the `UserSettingsDialog`.

**Tech Stack:** Bun + TypeScript + Hono (api), React + react-query + react-router (web), MongoDB, Zod, bun:test.

## Global Constraints

- Etsy `x-api-key` header format is colon-joined: `<keystring>:<shared_secret>` (verified against live API — see spec's "Verified API facts").
- OAuth 2.0 authorization-code + PKCE (S256) only — no legacy OAuth 1.0 path.
- Scopes requested up front, all at once: `listings_r listings_w shops_r transactions_r email_r` (spec decision — avoids re-consent later for the orders screen).
- Etsy endpoints used by this plan (confirmed via Etsy's own developer docs):
  - Authorize: `GET https://www.etsy.com/oauth/connect` (params: `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method=S256`)
  - Token exchange/refresh: `POST https://api.etsy.com/v3/public/oauth/token`, body `application/x-www-form-urlencoded`
  - `GET https://api.etsy.com/v3/application/users/me` → `{ user_id, shop_id }` (requires `shops_r` scope)
  - `GET https://api.etsy.com/v3/application/shops/{shop_id}` → includes `shop_name` (public, API key only)
- Access tokens live 1h; refresh 60s before expiry. Refresh tokens roll (90-day life) — always persist the newly returned pair, never reuse an old refresh token.
- Refresh failure marks the connection `broken: true`; nothing else in the app is affected (per spec's error-handling section).
- `etsyConnections` is one Mongo document per `userId` (not per id) — same shape as the existing `userSettings` collection.
- Follow the existing repo's layered pattern exactly (see `UserSettingsRepository` / `UserSettingsService` / `MongoUserSettingsRepository` / `handlers/UserSettings` for the reference shape) — do not introduce a different pattern.
- Tests: `bun:test`, mocks via `mock()`, following `DesignService/index.test.ts` conventions. Integration tests follow `MongoMaterialRepository/index.integration.test.ts` (`describe.if(RUN)`, `RUN_INTEGRATION_TESTS` env var, `createTestContext()`).
- Lint/format: `bun run lint` (Biome) must pass on touched files before each commit.

---

## File Structure

```
packages/types/src/etsyConnection/index.ts       # EtsyConnection zod schema + EtsyConnectionStatus type
packages/types/src/index.ts                      # + export etsyConnection

packages/api/src/config/index.ts                 # + etsy env vars
packages/api/src/domain/EtsyOAuthStateStore/index.ts        # in-memory CSRF-state + PKCE-verifier store
packages/api/src/domain/EtsyOAuthStateStore/index.test.ts
packages/api/src/domain/EtsyClient/index.ts                 # PKCE helpers + Etsy HTTP calls
packages/api/src/domain/EtsyClient/index.test.ts
packages/api/src/domain/EtsyConnectionRepository/index.ts   # interface
packages/api/src/domain/EtsyConnectionService/index.ts
packages/api/src/domain/EtsyConnectionService/index.test.ts
packages/api/src/infrastructure/MongoEtsyConnectionRepository/index.ts
packages/api/src/infrastructure/MongoEtsyConnectionRepository/index.integration.test.ts
packages/api/src/handlers/Etsy/index.ts
packages/api/src/dependencies/types.ts            # + tokens, Collections, CollectionNames
packages/api/src/dependencies/index.ts            # + registrations
packages/api/src/routes/index.ts                  # + 4 routes

packages/web/src/api/endpoints.ts                 # + etsy endpoint constants
packages/web/src/api/endpoints/etsyConnection/index.ts
packages/web/src/hooks/useEtsyConnection.ts
packages/web/src/pages/Settings/index.tsx          # new page: Etsy connection + Pricing (migrated from dialog)
packages/web/src/constants/routes.ts               # + SETTINGS_PAGE
packages/web/src/index.tsx                         # + /settings route
packages/web/src/components/MainLayout/index.tsx   # gear icon navigates to /settings instead of opening dialog
packages/web/src/components/UserSettingsDialog/index.tsx   # deleted (content moved into Settings page)

.env                                                # + ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_REDIRECT_URI, WEB_APP_URL
```

---

### Task 1: `EtsyConnection` type

**Files:**
- Create: `packages/types/src/etsyConnection/index.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Produces: `etsyConnectionSchema` (zod), `EtsyConnection` type, `EtsyConnectionStatus` type — consumed by every later task in this plan.

- [ ] **Step 1: Write the schema**

```typescript
// packages/types/src/etsyConnection/index.ts
import { z } from 'zod';

export const etsyConnectionSchema = z.object({
    userId: z.string(),
    shopId: z.number(),
    shopName: z.string(),
    accessToken: z.string(),
    accessTokenExpiresAt: z.number(), // epoch ms
    refreshToken: z.string(),
    connectedAt: z.number(), // epoch ms
    broken: z.boolean().optional(),
});

export type EtsyConnection = z.infer<typeof etsyConnectionSchema>;

export interface EtsyConnectionStatus {
    connected: boolean;
    shopName?: string;
    broken?: boolean;
}
```

- [ ] **Step 2: Export it from the package barrel**

Add this line to `packages/types/src/index.ts`, keeping the existing alphabetical-ish grouping (it belongs right after `editDesign`, before `formDesign`):

```typescript
export * from './etsyConnection/index';
```

- [ ] **Step 3: Typecheck**

Run: `bun run --filter @jewellery-catalogue/types build` (or `cd packages/types && bunx tsc --noEmit` if no build script exists — check `packages/types/package.json` first)
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/etsyConnection/index.ts packages/types/src/index.ts
git commit -m "feat(types): add EtsyConnection schema"
```

---

### Task 2: API config — Etsy env vars

**Files:**
- Modify: `packages/api/src/config/index.ts`
- Modify: `.env` (add empty keys — Igor fills in real values)

**Interfaces:**
- Produces: `config.get('etsyApiKey' | 'etsySharedSecret' | 'etsyRedirectUri' | 'webAppUrl')` — consumed by Task 6 (dependency registration) and Task 8 (callback redirect).

- [ ] **Step 1: Add the four config entries**

```typescript
// packages/api/src/config/index.ts
import { ConfigService, parsers } from '@imapps/api-utils';

const schema = {
    port: { parser: parsers.number, from: 'PORT' },
    connectionUri: { parser: parsers.string, from: 'CONNECTION_URI' },
    databaseName: { parser: parsers.string, from: 'DATABASE_NAME' },
    bucketName: { parser: parsers.string, from: 'BUCKET_NAME' },
    bucketAccessKey: { parser: parsers.string, from: 'BUCKET_ACCESS_KEY' },
    bucketSecretKey: { parser: parsers.string, from: 'BUCKET_SECRET_KEY' },
    bucketEndpoint: { parser: parsers.string, from: 'BUCKET_ENDPOINT' },
    etsyApiKey: { parser: parsers.string, from: 'ETSY_API_KEY' },
    etsySharedSecret: { parser: parsers.string, from: 'ETSY_SHARED_SECRET' },
    etsyRedirectUri: { parser: parsers.string, from: 'ETSY_REDIRECT_URI' },
    webAppUrl: { parser: parsers.string, from: 'WEB_APP_URL' },
} as const;

export const config = new ConfigService(schema);
```

- [ ] **Step 2: Add the keys to `.env`** (values left blank locally; Igor supplies the real Etsy keystring/shared secret and registers `ETSY_REDIRECT_URI` as a callback URL in the Etsy developer portal before this can be exercised end-to-end)

Append to `.env`:
```
ETSY_API_KEY=
ETSY_SHARED_SECRET=
ETSY_REDIRECT_URI=http://localhost:3000/api/etsy/oauth/callback
WEB_APP_URL=http://localhost:5173
```

(Check the actual web dev port in `packages/web/package.json`'s `start` script before finalizing `WEB_APP_URL`, and the api port from the existing `PORT` value in `.env` before finalizing `ETSY_REDIRECT_URI`.)

- [ ] **Step 3: Verify the api still boots**

Run: `bun run start:api` (from repo root, with `.env` populated with dummy non-empty strings for the new keys so `ConfigService` doesn't throw)
Expected: server starts on the configured port without a `ConfigError`

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/config/index.ts .env
git commit -m "feat(api): add Etsy OAuth config"
```

---

### Task 3: `EtsyOAuthStateStore`

**Files:**
- Create: `packages/api/src/domain/EtsyOAuthStateStore/index.ts`
- Create: `packages/api/src/domain/EtsyOAuthStateStore/index.test.ts`

**Interfaces:**
- Produces: `class EtsyOAuthStateStore { save(state: string, data: { userId: string; codeVerifier: string }): void; consume(state: string): { userId: string; codeVerifier: string } | null }` — consumed by `EtsyConnectionService` (Task 6).

This is a short-lived, in-memory, single-instance store for the handful of seconds between "Connect Etsy" click and the Etsy redirect back — CSRF `state` and PKCE `code_verifier` can't travel any other way because the callback request from Etsy is an unauthenticated browser redirect (no bearer token). Single API instance is a safe assumption at this app's scale (single shop owner).

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/api/src/domain/EtsyOAuthStateStore/index.test.ts
import { describe, expect, it } from 'bun:test';

import { EtsyOAuthStateStore } from './index';

describe('EtsyOAuthStateStore', () => {
    it('returns saved data on first consume', () => {
        const store = new EtsyOAuthStateStore();
        store.save('state-1', { userId: 'user-1', codeVerifier: 'verifier-1' });

        expect(store.consume('state-1')).toEqual({ userId: 'user-1', codeVerifier: 'verifier-1' });
    });

    it('is single-use — second consume returns null', () => {
        const store = new EtsyOAuthStateStore();
        store.save('state-1', { userId: 'user-1', codeVerifier: 'verifier-1' });

        store.consume('state-1');

        expect(store.consume('state-1')).toBeNull();
    });

    it('returns null for an unknown state', () => {
        const store = new EtsyOAuthStateStore();

        expect(store.consume('never-saved')).toBeNull();
    });

    it('returns null once the entry has expired', () => {
        const store = new EtsyOAuthStateStore(-1); // negative TTL: already expired the instant it's saved
        store.save('state-1', { userId: 'user-1', codeVerifier: 'verifier-1' });

        expect(store.consume('state-1')).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && bun test src/domain/EtsyOAuthStateStore/index.test.ts`
Expected: FAIL — `EtsyOAuthStateStore` module not found

- [ ] **Step 3: Implement**

```typescript
// packages/api/src/domain/EtsyOAuthStateStore/index.ts
interface PendingOAuthState {
    userId: string;
    codeVerifier: string;
    expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class EtsyOAuthStateStore {
    private readonly states = new Map<string, PendingOAuthState>();

    constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

    save(state: string, data: { userId: string; codeVerifier: string }): void {
        this.states.set(state, { ...data, expiresAt: Date.now() + this.ttlMs });
    }

    consume(state: string): { userId: string; codeVerifier: string } | null {
        const entry = this.states.get(state);
        this.states.delete(state);

        if (!entry || entry.expiresAt < Date.now()) return null;

        return { userId: entry.userId, codeVerifier: entry.codeVerifier };
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/api && bun test src/domain/EtsyOAuthStateStore/index.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/EtsyOAuthStateStore
git commit -m "feat(api): add EtsyOAuthStateStore for OAuth state/PKCE round-trip"
```

---

### Task 4: `EtsyClient`

**Files:**
- Create: `packages/api/src/domain/EtsyClient/index.ts`
- Create: `packages/api/src/domain/EtsyClient/index.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `generateCodeVerifier(): string`, `generateCodeChallenge(verifier: string): string`, `generateState(): string` (standalone exports)
  - `class EtsyClient { constructor(apiKey: string, sharedSecret: string); buildAuthorizationUrl(args: { redirectUri: string; state: string; codeChallenge: string; scope: string }): string; exchangeCodeForToken(args: { code: string; codeVerifier: string; redirectUri: string }): Promise<EtsyTokenResponse>; refreshAccessToken(refreshToken: string): Promise<EtsyTokenResponse>; getMe(accessToken: string): Promise<{ userId: number; shopId: number }>; getShop(shopId: number): Promise<{ shopId: number; shopName: string }> }`
  - `interface EtsyTokenResponse { accessToken: string; refreshToken: string; expiresIn: number }`
  - consumed by `EtsyConnectionService` (Task 6).

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/api/src/domain/EtsyClient/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { EtsyClient, generateCodeChallenge, generateCodeVerifier, generateState } from './index';

describe('PKCE helpers', () => {
    it('generateCodeVerifier produces a 43-128 char unreserved-URI string', () => {
        const verifier = generateCodeVerifier();
        expect(verifier.length).toBeGreaterThanOrEqual(43);
        expect(verifier.length).toBeLessThanOrEqual(128);
        expect(verifier).toMatch(/^[A-Za-z0-9._~-]+$/);
    });

    it('generateCodeChallenge is deterministic for a given verifier', () => {
        const challenge1 = generateCodeChallenge('fixed-verifier-value');
        const challenge2 = generateCodeChallenge('fixed-verifier-value');
        expect(challenge1).toBe(challenge2);
        expect(challenge1).not.toContain('='); // base64url, no padding
    });

    it('generateState produces a non-empty string', () => {
        expect(generateState().length).toBeGreaterThan(0);
    });
});

describe('EtsyClient', () => {
    let client: EtsyClient;
    let fetchMock: ReturnType<typeof mock>;

    beforeEach(() => {
        client = new EtsyClient('key123', 'secret456');
        fetchMock = mock();
        globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    describe('buildAuthorizationUrl', () => {
        it('includes all required OAuth params', () => {
            const url = client.buildAuthorizationUrl({
                redirectUri: 'https://example.com/callback',
                state: 'the-state',
                codeChallenge: 'the-challenge',
                scope: 'listings_r listings_w',
            });

            const parsed = new URL(url);
            expect(parsed.origin + parsed.pathname).toBe('https://www.etsy.com/oauth/connect');
            expect(parsed.searchParams.get('response_type')).toBe('code');
            expect(parsed.searchParams.get('client_id')).toBe('key123');
            expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/callback');
            expect(parsed.searchParams.get('state')).toBe('the-state');
            expect(parsed.searchParams.get('code_challenge')).toBe('the-challenge');
            expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
            expect(parsed.searchParams.get('scope')).toBe('listings_r listings_w');
        });
    });

    describe('exchangeCodeForToken', () => {
        it('posts form-urlencoded body and maps the response', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, token_type: 'Bearer' }),
                    { status: 200 }
                )
            );

            const result = await client.exchangeCodeForToken({
                code: 'auth-code',
                codeVerifier: 'verifier',
                redirectUri: 'https://example.com/callback',
            });

            expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 });

            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/public/oauth/token');
            expect(options.method).toBe('POST');
            expect((options.headers as Record<string, string>)['Content-Type']).toBe(
                'application/x-www-form-urlencoded'
            );
            const body = new URLSearchParams(options.body as string);
            expect(body.get('grant_type')).toBe('authorization_code');
            expect(body.get('client_id')).toBe('key123');
            expect(body.get('code')).toBe('auth-code');
            expect(body.get('code_verifier')).toBe('verifier');
            expect(body.get('redirect_uri')).toBe('https://example.com/callback');
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
            );

            await expect(
                client.exchangeCodeForToken({ code: 'bad', codeVerifier: 'v', redirectUri: 'https://x' })
            ).rejects.toThrow();
        });
    });

    describe('refreshAccessToken', () => {
        it('posts refresh_token grant and maps the response', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({ access_token: 'at2', refresh_token: 'rt2', expires_in: 3600 }),
                    { status: 200 }
                )
            );

            const result = await client.refreshAccessToken('old-refresh-token');

            expect(result).toEqual({ accessToken: 'at2', refreshToken: 'rt2', expiresIn: 3600 });
            const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            const body = new URLSearchParams(options.body as string);
            expect(body.get('grant_type')).toBe('refresh_token');
            expect(body.get('refresh_token')).toBe('old-refresh-token');
        });
    });

    describe('getMe', () => {
        it('sends bearer + x-api-key headers and maps snake_case to camelCase', async () => {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ user_id: 844469719, shop_id: 47408839 }), { status: 200 })
            );

            const result = await client.getMe('access-token-1');

            expect(result).toEqual({ userId: 844469719, shopId: 47408839 });
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/users/me');
            const headers = options.headers as Record<string, string>;
            expect(headers['x-api-key']).toBe('key123:secret456');
            expect(headers.Authorization).toBe('Bearer access-token-1');
        });
    });

    describe('getShop', () => {
        it('fetches shop by id and maps shop_name', async () => {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ shop_id: 47408839, shop_name: 'MariCrystalJewellery' }), {
                    status: 200,
                })
            );

            const result = await client.getShop(47408839);

            expect(result).toEqual({ shopId: 47408839, shopName: 'MariCrystalJewellery' });
            const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839');
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && bun test src/domain/EtsyClient/index.test.ts`
Expected: FAIL — `EtsyClient` module not found

- [ ] **Step 3: Implement**

```typescript
// packages/api/src/domain/EtsyClient/index.ts
import { createHash, randomBytes } from 'node:crypto';

const AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect';
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const API_BASE = 'https://api.etsy.com/v3/application';

export interface EtsyTokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

const base64UrlEncode = (input: Buffer): string =>
    input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

export const generateCodeVerifier = (): string => base64UrlEncode(randomBytes(32));

export const generateCodeChallenge = (verifier: string): string =>
    base64UrlEncode(createHash('sha256').update(verifier).digest());

export const generateState = (): string => base64UrlEncode(randomBytes(16));

interface EtsyTokenApiResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

const mapTokenResponse = (body: EtsyTokenApiResponse): EtsyTokenResponse => ({
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
});

export class EtsyClient {
    constructor(
        private readonly apiKey: string,
        private readonly sharedSecret: string
    ) {}

    private apiKeyHeader(): string {
        return `${this.apiKey}:${this.sharedSecret}`;
    }

    buildAuthorizationUrl(args: { redirectUri: string; state: string; codeChallenge: string; scope: string }): string {
        const url = new URL(AUTHORIZE_URL);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', this.apiKey);
        url.searchParams.set('redirect_uri', args.redirectUri);
        url.searchParams.set('scope', args.scope);
        url.searchParams.set('state', args.state);
        url.searchParams.set('code_challenge', args.codeChallenge);
        url.searchParams.set('code_challenge_method', 'S256');
        return url.toString();
    }

    private async postToken(params: Record<string, string>): Promise<EtsyTokenResponse> {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString(),
        });

        if (!response.ok) {
            throw new Error(`Etsy token request failed: ${response.status} ${await response.text()}`);
        }

        return mapTokenResponse((await response.json()) as EtsyTokenApiResponse);
    }

    async exchangeCodeForToken(args: { code: string; codeVerifier: string; redirectUri: string }): Promise<EtsyTokenResponse> {
        return this.postToken({
            grant_type: 'authorization_code',
            client_id: this.apiKey,
            redirect_uri: args.redirectUri,
            code: args.code,
            code_verifier: args.codeVerifier,
        });
    }

    async refreshAccessToken(refreshToken: string): Promise<EtsyTokenResponse> {
        return this.postToken({
            grant_type: 'refresh_token',
            client_id: this.apiKey,
            refresh_token: refreshToken,
        });
    }

    async getMe(accessToken: string): Promise<{ userId: number; shopId: number }> {
        const response = await fetch(`${API_BASE}/users/me`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`Etsy getMe failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as { user_id: number; shop_id: number };
        return { userId: body.user_id, shopId: body.shop_id };
    }

    async getShop(shopId: number): Promise<{ shopId: number; shopName: string }> {
        const response = await fetch(`${API_BASE}/shops/${shopId}`, {
            headers: { 'x-api-key': this.apiKeyHeader() },
        });

        if (!response.ok) {
            throw new Error(`Etsy getShop failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as { shop_id: number; shop_name: string };
        return { shopId: body.shop_id, shopName: body.shop_name };
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/api && bun test src/domain/EtsyClient/index.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/EtsyClient
git commit -m "feat(api): add EtsyClient for OAuth token exchange and shop lookup"
```

---

### Task 5: `EtsyConnectionRepository` + `MongoEtsyConnectionRepository`

**Files:**
- Create: `packages/api/src/domain/EtsyConnectionRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoEtsyConnectionRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoEtsyConnectionRepository/index.integration.test.ts`
- Modify: `packages/api/src/dependencies/types.ts` (add `EtsyConnections` collection + `EtsyConnectionRepository` token — full wiring happens in Task 8, but the `Collections`/`CollectionNames` additions are needed now so the repository compiles)

**Interfaces:**
- Consumes: `EtsyConnection` type (Task 1).
- Produces: `interface EtsyConnectionRepository { getByUserId(userId: string): Promise<EtsyConnection | null>; upsert(connection: EtsyConnection): Promise<void>; deleteByUserId(userId: string): Promise<void> }` and `class MongoEtsyConnectionRepository implements EtsyConnectionRepository` — consumed by `EtsyConnectionService` (Task 6) and dependency wiring (Task 8).

- [ ] **Step 1: Add the collection to `Collections`/`CollectionNames`**

In `packages/api/src/dependencies/types.ts`, add the import and three additions (leave everything else unchanged):

```typescript
import type { Design, Draft, EtsyConnection, Material, UserSettings } from '@jewellery-catalogue/types';
```

```typescript
export type Collections = {
    [CollectionNames.Designs]: Design;
    [CollectionNames.Materials]: Material;
    [CollectionNames.Drafts]: Draft;
    [CollectionNames.UserSettings]: UserSettings;
    [CollectionNames.EtsyConnections]: EtsyConnection;
};
```

```typescript
export enum CollectionNames {
    Designs = 'designs',
    Materials = 'materials',
    Drafts = 'drafts',
    UserSettings = 'userSettings',
    EtsyConnections = 'etsyConnections',
}
```

- [ ] **Step 2: Write the repository interface**

```typescript
// packages/api/src/domain/EtsyConnectionRepository/index.ts
import type { EtsyConnection } from '@jewellery-catalogue/types';

export interface EtsyConnectionRepository {
    getByUserId(userId: string): Promise<EtsyConnection | null>;
    upsert(connection: EtsyConnection): Promise<void>;
    deleteByUserId(userId: string): Promise<void>;
}
```

- [ ] **Step 3: Write the failing integration test**

```typescript
// packages/api/src/infrastructure/MongoEtsyConnectionRepository/index.integration.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { EtsyConnection } from '@jewellery-catalogue/types';

import { createTestContext, type TestContext } from '../../test-helpers/mongodb';
import { MongoEtsyConnectionRepository } from './index';

function makeConnection(userId: string): EtsyConnection {
    return {
        userId,
        shopId: 47408839,
        shopName: 'MariCrystalJewellery',
        accessToken: 'access-token',
        accessTokenExpiresAt: Date.now() + 3600_000,
        refreshToken: 'refresh-token',
        connectedAt: Date.now(),
    };
}

const RUN = !!process.env.RUN_INTEGRATION_TESTS;

describe.if(RUN)('MongoEtsyConnectionRepository (integration)', () => {
    let ctx: TestContext;
    let repo: MongoEtsyConnectionRepository;

    beforeAll(async () => {
        ctx = await createTestContext();
        repo = new MongoEtsyConnectionRepository(ctx.mongoDb);
    });

    beforeEach(async () => {
        await ctx.clearCollections();
    });

    afterAll(async () => {
        await ctx.close();
    });

    it('returns null when no connection exists for the user', async () => {
        expect(await repo.getByUserId('user-1')).toBeNull();
    });

    it('upsert then getByUserId round-trips the connection, excluding _id', async () => {
        const connection = makeConnection('user-1');
        await repo.upsert(connection);

        const result = await repo.getByUserId('user-1');

        expect(result).toEqual(connection);
        expect((result as any)?._id).toBeUndefined();
    });

    it('upsert replaces the existing connection for the same user', async () => {
        await repo.upsert(makeConnection('user-1'));
        const updated = { ...makeConnection('user-1'), shopName: 'RenamedShop' };
        await repo.upsert(updated);

        const result = await repo.getByUserId('user-1');

        expect(result?.shopName).toBe('RenamedShop');
    });

    it('deleteByUserId removes the connection', async () => {
        await repo.upsert(makeConnection('user-1'));
        await repo.deleteByUserId('user-1');

        expect(await repo.getByUserId('user-1')).toBeNull();
    });
});
```

- [ ] **Step 4: Run the integration test to verify it fails**

Run: `cd packages/api && docker compose -f ../../docker-compose.test.yml up -d --wait && RUN_INTEGRATION_TESTS=1 bun test src/infrastructure/MongoEtsyConnectionRepository/index.integration.test.ts`
Expected: FAIL — `MongoEtsyConnectionRepository` module not found

- [ ] **Step 5: Implement the repository**

```typescript
// packages/api/src/infrastructure/MongoEtsyConnectionRepository/index.ts
import type { MongoDbConnection } from '@imapps/api-utils';
import type { EtsyConnection } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { EtsyConnectionRepository } from '../../domain/EtsyConnectionRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoEtsyConnectionRepository
    extends MongoRepository<EtsyConnection>
    implements EtsyConnectionRepository
{
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.EtsyConnections);
    }

    async getByUserId(userId: string): Promise<EtsyConnection | null> {
        return this.collection().findOne({ userId }, { projection: { _id: 0 } });
    }

    async upsert(connection: EtsyConnection): Promise<void> {
        await this.collection().findOneAndReplace({ userId: connection.userId }, connection, {
            upsert: true,
        });
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.collection().deleteOne({ userId });
    }
}
```

- [ ] **Step 6: Run the integration test to verify it passes**

Run: `cd packages/api && RUN_INTEGRATION_TESTS=1 bun test src/infrastructure/MongoEtsyConnectionRepository/index.integration.test.ts; docker compose -f ../../docker-compose.test.yml down`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/domain/EtsyConnectionRepository packages/api/src/infrastructure/MongoEtsyConnectionRepository packages/api/src/dependencies/types.ts
git commit -m "feat(api): add EtsyConnectionRepository and Mongo implementation"
```

---

### Task 6: `EtsyConnectionService`

**Files:**
- Create: `packages/api/src/domain/EtsyConnectionService/index.ts`
- Create: `packages/api/src/domain/EtsyConnectionService/index.test.ts`

**Interfaces:**
- Consumes: `EtsyClient` (Task 4: `buildAuthorizationUrl`, `exchangeCodeForToken`, `refreshAccessToken`, `getMe`, `getShop`), `EtsyOAuthStateStore` (Task 3: `save`, `consume`), `EtsyConnectionRepository` (Task 5), `EtsyConnection`/`EtsyConnectionStatus` (Task 1).
- Produces: `class EtsyConnectionService { constructor(etsyClient: EtsyClient, connectionRepo: EtsyConnectionRepository, stateStore: EtsyOAuthStateStore, redirectUri: string); startAuthorization(userId: string): { url: string }; handleCallback(code: string, state: string): Promise<{ userId: string }>; getStatus(userId: string): Promise<EtsyConnectionStatus>; disconnect(userId: string): Promise<void>; getValidAccessToken(userId: string): Promise<string> }` — consumed by `handlers/Etsy` (Task 8).

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/api/src/domain/EtsyConnectionService/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { EtsyConnection } from '@jewellery-catalogue/types';

import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { EtsyOAuthStateStore } from '../EtsyOAuthStateStore';
import { EtsyConnectionService } from './index';

const mockEtsyClient = {
    buildAuthorizationUrl: mock(),
    exchangeCodeForToken: mock(),
    refreshAccessToken: mock(),
    getMe: mock(),
    getShop: mock(),
};

const mockConnectionRepo = {
    getByUserId: mock(),
    upsert: mock(),
    deleteByUserId: mock(),
};

const mockStateStore = {
    save: mock(),
    consume: mock(),
};

const REDIRECT_URI = 'https://example.com/api/etsy/oauth/callback';

function makeConnection(overrides: Partial<EtsyConnection> = {}): EtsyConnection {
    return {
        userId: 'user-1',
        shopId: 47408839,
        shopName: 'MariCrystalJewellery',
        accessToken: 'access-token',
        accessTokenExpiresAt: Date.now() + 3600_000,
        refreshToken: 'refresh-token',
        connectedAt: Date.now(),
        ...overrides,
    };
}

describe('EtsyConnectionService', () => {
    let service: EtsyConnectionService;

    beforeEach(() => {
        Object.values(mockEtsyClient).forEach((m) => m.mockClear());
        Object.values(mockConnectionRepo).forEach((m) => m.mockClear());
        Object.values(mockStateStore).forEach((m) => m.mockClear());
        service = new EtsyConnectionService(
            mockEtsyClient as unknown as EtsyClient,
            mockConnectionRepo as unknown as EtsyConnectionRepository,
            mockStateStore as unknown as EtsyOAuthStateStore,
            REDIRECT_URI
        );
    });

    describe('startAuthorization', () => {
        it('saves state+verifier and returns the authorization url', () => {
            mockEtsyClient.buildAuthorizationUrl.mockReturnValue('https://www.etsy.com/oauth/connect?...');

            const result = service.startAuthorization('user-1');

            expect(result).toEqual({ url: 'https://www.etsy.com/oauth/connect?...' });
            expect(mockStateStore.save).toHaveBeenCalledTimes(1);
            const [state, data] = mockStateStore.save.mock.calls[0] as [string, { userId: string; codeVerifier: string }];
            expect(data.userId).toBe('user-1');
            expect(typeof state).toBe('string');
            expect(typeof data.codeVerifier).toBe('string');

            expect(mockEtsyClient.buildAuthorizationUrl).toHaveBeenCalledWith(
                expect.objectContaining({ redirectUri: REDIRECT_URI, scope: expect.any(String) })
            );
        });
    });

    describe('handleCallback', () => {
        it('exchanges the code, looks up shop info, and persists the connection', async () => {
            mockStateStore.consume.mockReturnValue({ userId: 'user-1', codeVerifier: 'verifier-1' });
            mockEtsyClient.exchangeCodeForToken.mockResolvedValue({
                accessToken: 'at',
                refreshToken: 'rt',
                expiresIn: 3600,
            });
            mockEtsyClient.getMe.mockResolvedValue({ userId: 844469719, shopId: 47408839 });
            mockEtsyClient.getShop.mockResolvedValue({ shopId: 47408839, shopName: 'MariCrystalJewellery' });

            const result = await service.handleCallback('auth-code', 'the-state');

            expect(result).toEqual({ userId: 'user-1' });
            expect(mockEtsyClient.exchangeCodeForToken).toHaveBeenCalledWith({
                code: 'auth-code',
                codeVerifier: 'verifier-1',
                redirectUri: REDIRECT_URI,
            });
            expect(mockConnectionRepo.upsert).toHaveBeenCalledTimes(1);
            const persisted = mockConnectionRepo.upsert.mock.calls[0][0] as EtsyConnection;
            expect(persisted.userId).toBe('user-1');
            expect(persisted.shopId).toBe(47408839);
            expect(persisted.shopName).toBe('MariCrystalJewellery');
            expect(persisted.accessToken).toBe('at');
            expect(persisted.refreshToken).toBe('rt');
        });

        it('throws when the state is invalid or expired', async () => {
            mockStateStore.consume.mockReturnValue(null);

            await expect(service.handleCallback('auth-code', 'bad-state')).rejects.toThrow();
            expect(mockEtsyClient.exchangeCodeForToken).not.toHaveBeenCalled();
        });
    });

    describe('getStatus', () => {
        it('returns connected:false when no connection exists', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(null);

            expect(await service.getStatus('user-1')).toEqual({ connected: false });
        });

        it('returns connected:true with shop name when a connection exists', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(makeConnection());

            expect(await service.getStatus('user-1')).toEqual({
                connected: true,
                shopName: 'MariCrystalJewellery',
                broken: undefined,
            });
        });

        it('surfaces broken:true', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(makeConnection({ broken: true }));

            expect(await service.getStatus('user-1')).toEqual({
                connected: true,
                shopName: 'MariCrystalJewellery',
                broken: true,
            });
        });
    });

    describe('disconnect', () => {
        it('deletes the stored connection', async () => {
            await service.disconnect('user-1');

            expect(mockConnectionRepo.deleteByUserId).toHaveBeenCalledWith('user-1');
        });
    });

    describe('getValidAccessToken', () => {
        it('returns the stored access token when it has more than 60s of life left', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(
                makeConnection({ accessToken: 'still-fresh', accessTokenExpiresAt: Date.now() + 120_000 })
            );

            expect(await service.getValidAccessToken('user-1')).toBe('still-fresh');
            expect(mockEtsyClient.refreshAccessToken).not.toHaveBeenCalled();
        });

        it('refreshes and persists the new pair when the token is near expiry', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(
                makeConnection({ accessToken: 'stale', accessTokenExpiresAt: Date.now() + 10_000 })
            );
            mockEtsyClient.refreshAccessToken.mockResolvedValue({
                accessToken: 'fresh',
                refreshToken: 'fresh-refresh',
                expiresIn: 3600,
            });

            const token = await service.getValidAccessToken('user-1');

            expect(token).toBe('fresh');
            const persisted = mockConnectionRepo.upsert.mock.calls[0][0] as EtsyConnection;
            expect(persisted.accessToken).toBe('fresh');
            expect(persisted.refreshToken).toBe('fresh-refresh');
            expect(persisted.broken).toBeFalsy();
        });

        it('marks the connection broken and throws when refresh fails', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(
                makeConnection({ accessTokenExpiresAt: Date.now() + 10_000 })
            );
            mockEtsyClient.refreshAccessToken.mockRejectedValue(new Error('refresh failed'));

            await expect(service.getValidAccessToken('user-1')).rejects.toThrow();
            const persisted = mockConnectionRepo.upsert.mock.calls[0][0] as EtsyConnection;
            expect(persisted.broken).toBe(true);
        });

        it('throws when there is no connection for the user', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(null);

            await expect(service.getValidAccessToken('user-1')).rejects.toThrow();
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && bun test src/domain/EtsyConnectionService/index.test.ts`
Expected: FAIL — `EtsyConnectionService` module not found

- [ ] **Step 3: Implement**

```typescript
// packages/api/src/domain/EtsyConnectionService/index.ts
import { APIError } from '@imapps/api-utils/hono';
import type { EtsyConnection, EtsyConnectionStatus } from '@jewellery-catalogue/types';

import { generateCodeChallenge, generateCodeVerifier, generateState } from '../EtsyClient';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { EtsyOAuthStateStore } from '../EtsyOAuthStateStore';

const SCOPES = 'listings_r listings_w shops_r transactions_r email_r';
const REFRESH_MARGIN_MS = 60_000;

export class EtsyConnectionService {
    constructor(
        private readonly etsyClient: EtsyClient,
        private readonly connectionRepo: EtsyConnectionRepository,
        private readonly stateStore: EtsyOAuthStateStore,
        private readonly redirectUri: string
    ) {}

    startAuthorization(userId: string): { url: string } {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = generateState();

        this.stateStore.save(state, { userId, codeVerifier });

        const url = this.etsyClient.buildAuthorizationUrl({
            redirectUri: this.redirectUri,
            state,
            codeChallenge,
            scope: SCOPES,
        });

        return { url };
    }

    async handleCallback(code: string, state: string): Promise<{ userId: string }> {
        const pending = this.stateStore.consume(state);
        if (!pending) {
            throw new APIError('Invalid or expired Etsy OAuth state', 400);
        }

        const tokens = await this.etsyClient.exchangeCodeForToken({
            code,
            codeVerifier: pending.codeVerifier,
            redirectUri: this.redirectUri,
        });

        const me = await this.etsyClient.getMe(tokens.accessToken);
        const shop = await this.etsyClient.getShop(me.shopId);

        const connection: EtsyConnection = {
            userId: pending.userId,
            shopId: shop.shopId,
            shopName: shop.shopName,
            accessToken: tokens.accessToken,
            accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
            refreshToken: tokens.refreshToken,
            connectedAt: Date.now(),
        };

        await this.connectionRepo.upsert(connection);

        return { userId: pending.userId };
    }

    async getStatus(userId: string): Promise<EtsyConnectionStatus> {
        const connection = await this.connectionRepo.getByUserId(userId);
        if (!connection) return { connected: false };

        return { connected: true, shopName: connection.shopName, broken: connection.broken };
    }

    async disconnect(userId: string): Promise<void> {
        await this.connectionRepo.deleteByUserId(userId);
    }

    async getValidAccessToken(userId: string): Promise<string> {
        const connection = await this.connectionRepo.getByUserId(userId);
        if (!connection) {
            throw new APIError('Etsy is not connected', 400);
        }

        if (connection.accessTokenExpiresAt - Date.now() > REFRESH_MARGIN_MS) {
            return connection.accessToken;
        }

        try {
            const tokens = await this.etsyClient.refreshAccessToken(connection.refreshToken);
            const updated: EtsyConnection = {
                ...connection,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
                broken: false,
            };
            await this.connectionRepo.upsert(updated);
            return updated.accessToken;
        } catch (error) {
            await this.connectionRepo.upsert({ ...connection, broken: true });
            throw new APIError('Etsy connection is broken — reconnect required', 409);
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/api && bun test src/domain/EtsyConnectionService/index.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/EtsyConnectionService
git commit -m "feat(api): add EtsyConnectionService orchestrating OAuth + token refresh"
```

---

### Task 7: `handlers/Etsy` + routes + dependency wiring

**Files:**
- Create: `packages/api/src/handlers/Etsy/index.ts`
- Modify: `packages/api/src/dependencies/types.ts` (add remaining tokens)
- Modify: `packages/api/src/dependencies/index.ts` (register `EtsyClient`, `EtsyOAuthStateStore`, `EtsyConnectionRepository`, `EtsyConnectionService`)
- Modify: `packages/api/src/routes/index.ts` (add 4 routes)

**Interfaces:**
- Consumes: `EtsyConnectionService` (Task 6), `dependencyContainer`/`DependencyToken` pattern (existing, see `handlers/UserSettings`).
- Produces: `GET /api/etsy/oauth/start` (authenticated, returns `{ url }`), `GET /api/etsy/oauth/callback` (unauthenticated — Etsy redirects the browser here), `GET /api/etsy/connection` (authenticated, returns `EtsyConnectionStatus`), `DELETE /api/etsy/connection` (authenticated, 204) — consumed by the web endpoints in Task 9.

- [ ] **Step 1: Add the remaining dependency tokens**

In `packages/api/src/dependencies/types.ts`, extend the existing enums/types (the `EtsyConnections`/`EtsyConnection` collection entry was already added in Task 5 — add the rest now):

```typescript
import type { EtsyClient } from '../domain/EtsyClient';
import type { EtsyConnectionRepository } from '../domain/EtsyConnectionRepository';
import type { EtsyConnectionService } from '../domain/EtsyConnectionService';
import type { EtsyOAuthStateStore } from '../domain/EtsyOAuthStateStore';
```

```typescript
export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger',
    Bucket = 'Bucket',
    // Repositories
    DesignRepository = 'DesignRepository',
    MaterialRepository = 'MaterialRepository',
    DraftRepository = 'DraftRepository',
    UserSettingsRepository = 'UserSettingsRepository',
    EtsyConnectionRepository = 'EtsyConnectionRepository',
    // Services
    DesignService = 'DesignService',
    MaterialService = 'MaterialService',
    ImageService = 'ImageService',
    DraftService = 'DraftService',
    UserSettingsService = 'UserSettingsService',
    EtsyConnectionService = 'EtsyConnectionService',
    // Infrastructure
    IdGenerator = 'IdGenerator',
    ImageStore = 'ImageStore',
    EtsyClient = 'EtsyClient',
    EtsyOAuthStateStore = 'EtsyOAuthStateStore',
}
```

```typescript
export type Dependencies = {
    [DependencyToken.Database]: MongoDbConnection<Collections>;
    [DependencyToken.Logger]: Logger;
    [DependencyToken.Bucket]: ObjectStoreConnection;
    // Repositories
    [DependencyToken.DesignRepository]: DesignRepository;
    [DependencyToken.MaterialRepository]: MaterialRepository;
    [DependencyToken.DraftRepository]: DraftRepository;
    [DependencyToken.UserSettingsRepository]: UserSettingsRepository;
    [DependencyToken.EtsyConnectionRepository]: EtsyConnectionRepository;
    // Services
    [DependencyToken.DesignService]: DesignService;
    [DependencyToken.MaterialService]: MaterialService;
    [DependencyToken.ImageService]: ImageService;
    [DependencyToken.DraftService]: DraftService;
    [DependencyToken.UserSettingsService]: UserSettingsService;
    [DependencyToken.EtsyConnectionService]: EtsyConnectionService;
    // Infrastructure
    [DependencyToken.IdGenerator]: IdGenerator;
    [DependencyToken.ImageStore]: ImageStore;
    [DependencyToken.EtsyClient]: EtsyClient;
    [DependencyToken.EtsyOAuthStateStore]: EtsyOAuthStateStore;
};
```

- [ ] **Step 2: Register the dependencies**

In `packages/api/src/dependencies/index.ts`, add imports:

```typescript
import { config } from '../config';
import { EtsyClient } from '../domain/EtsyClient';
import { EtsyConnectionService } from '../domain/EtsyConnectionService';
import { EtsyOAuthStateStore } from '../domain/EtsyOAuthStateStore';
import { MongoEtsyConnectionRepository } from '../infrastructure/MongoEtsyConnectionRepository';
```

And add these registrations inside `registerDepdendencies` (anywhere after the Database registration; grouped near the other repositories/services for readability):

```typescript
    dependencyContainer.registerSingleton(
        DependencyToken.EtsyConnectionRepository,
        class {
            constructor() {
                return new MongoEtsyConnectionRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyClient,
        class {
            constructor() {
                return new EtsyClient(config.get('etsyApiKey'), config.get('etsySharedSecret'));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyOAuthStateStore,
        class {
            constructor() {
                return new EtsyOAuthStateStore();
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyConnectionService,
        class {
            constructor() {
                return new EtsyConnectionService(
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionRepository),
                    dependencyContainer.resolve(DependencyToken.EtsyOAuthStateStore),
                    config.get('etsyRedirectUri')
                );
            }
        } as any
    );
```

- [ ] **Step 3: Write the handlers**

```typescript
// packages/api/src/handlers/Etsy/index.ts
import type { Context } from 'hono';

import { config } from '../../config';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { EtsyConnectionService } from '../../domain/EtsyConnectionService';

type AuthedCtx = Context<{ Variables: { userId: string } }>;

const getService = (): EtsyConnectionService => dependencyContainer.resolve(DependencyToken.EtsyConnectionService);

export const startEtsyOAuth = async (c: AuthedCtx) => c.json(getService().startAuthorization(c.get('userId')));

export const etsyOAuthCallback = async (c: Context) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const webAppUrl = config.get('webAppUrl');

    if (!code || !state) {
        return c.redirect(`${webAppUrl}/settings?etsy=error`);
    }

    try {
        await getService().handleCallback(code, state);
        return c.redirect(`${webAppUrl}/settings?etsy=connected`);
    } catch {
        return c.redirect(`${webAppUrl}/settings?etsy=error`);
    }
};

export const getEtsyConnectionStatus = async (c: AuthedCtx) => c.json(await getService().getStatus(c.get('userId')));

export const disconnectEtsyConnection = async (c: AuthedCtx) => {
    await getService().disconnect(c.get('userId'));
    return c.body(null, 204);
};
```

- [ ] **Step 4: Register the routes**

In `packages/api/src/routes/index.ts`, add the import:

```typescript
import {
    disconnectEtsyConnection,
    etsyOAuthCallback,
    getEtsyConnectionStatus,
    startEtsyOAuth,
} from '../handlers/Etsy';
```

And add these routes (placed near the top, alongside `/api/user-settings`):

```typescript
    app.get('/api/etsy/oauth/start', authenticate, startEtsyOAuth);
    app.get('/api/etsy/oauth/callback', etsyOAuthCallback);
    app.get('/api/etsy/connection', authenticate, getEtsyConnectionStatus);
    app.delete('/api/etsy/connection', authenticate, disconnectEtsyConnection);
```

- [ ] **Step 5: Typecheck and run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all existing + new tests PASS, no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/handlers/Etsy packages/api/src/dependencies packages/api/src/routes/index.ts
git commit -m "feat(api): wire up Etsy OAuth routes and dependency registrations"
```

---

### Task 8: Web — Etsy connection API client + hook

**Files:**
- Modify: `packages/web/src/api/endpoints.ts`
- Create: `packages/web/src/api/endpoints/etsyConnection/index.ts`
- Create: `packages/web/src/hooks/useEtsyConnection.ts`

**Interfaces:**
- Consumes: `EtsyConnectionStatus` type (Task 1), `MethodType`/`makeRequestWithAutoRefresh` (existing), the 3 endpoints from Task 7.
- Produces: `useEtsyConnection(): { connected: boolean; shopName?: string; broken?: boolean; isLoading: boolean; connect: () => Promise<{ url: string }>; isConnecting: boolean; disconnect: () => Promise<void>; isDisconnecting: boolean }` — consumed by the Settings page (Task 9).

- [ ] **Step 1: Add endpoint constants**

Add to `packages/web/src/api/endpoints.ts`:

```typescript
export const ETSY_OAUTH_START_ENDPOINT = '/api/etsy/oauth/start';
export const ETSY_CONNECTION_ENDPOINT = '/api/etsy/connection';
```

- [ ] **Step 2: Write the endpoint functions**

```typescript
// packages/web/src/api/endpoints/etsyConnection/index.ts
import { MethodType } from '@jewellery-catalogue/types';
import type { EtsyConnectionStatus } from '@jewellery-catalogue/types';

import { ETSY_CONNECTION_ENDPOINT, ETSY_OAUTH_START_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGetEtsyConnectionStatusRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyConnectionStatus>(
        {
            pathname: ETSY_CONNECTION_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch etsy connection status',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeStartEtsyOAuthRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<{ url: string }>(
        {
            pathname: ETSY_OAUTH_START_ENDPOINT,
            method: MethodType.GET,
            operationString: 'start etsy oauth',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeDisconnectEtsyRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<null>(
        {
            pathname: ETSY_CONNECTION_ENDPOINT,
            method: MethodType.DELETE,
            operationString: 'disconnect etsy',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

- [ ] **Step 3: Write the hook**

```typescript
// packages/web/src/hooks/useEtsyConnection.ts
import { useAuth } from '@imapps/web-utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    makeDisconnectEtsyRequest,
    makeGetEtsyConnectionStatusRequest,
    makeStartEtsyOAuthRequest,
} from '../api/endpoints/etsyConnection';

const QUERY_KEY = ['etsy-connection'];

export const useEtsyConnection = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => makeGetEtsyConnectionStatusRequest(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const connectMutation = useMutation({
        mutationFn: () => makeStartEtsyOAuthRequest(() => accessToken, login, logout),
    });

    const disconnectMutation = useMutation({
        mutationFn: () => makeDisconnectEtsyRequest(() => accessToken, login, logout),
        onSuccess: () => {
            queryClient.setQueryData(QUERY_KEY, { connected: false });
        },
    });

    return {
        connected: data?.connected ?? false,
        shopName: data?.shopName,
        broken: data?.broken,
        isLoading,
        connect: connectMutation.mutateAsync,
        isConnecting: connectMutation.isPending,
        disconnect: disconnectMutation.mutateAsync,
        isDisconnecting: disconnectMutation.isPending,
    };
};
```

- [ ] **Step 4: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/api/endpoints.ts packages/web/src/api/endpoints/etsyConnection packages/web/src/hooks/useEtsyConnection.ts
git commit -m "feat(web): add Etsy connection API client and hook"
```

---

### Task 9: Web — Settings page (Etsy connection + migrated Pricing), route, nav

**Files:**
- Create: `packages/web/src/pages/Settings/index.tsx`
- Modify: `packages/web/src/constants/routes.ts`
- Modify: `packages/web/src/index.tsx`
- Modify: `packages/web/src/components/MainLayout/index.tsx`
- Delete: `packages/web/src/components/UserSettingsDialog/index.tsx`

**Interfaces:**
- Consumes: `useEtsyConnection` (Task 8), `useUserSettings` (existing, unchanged), `SETTINGS_PAGE` route constant (this task), existing UI primitives (`Button`, `Card`-equivalent — check what's available in `packages/web/src/components/ui` before writing; use `Dialog`less plain sections since this is a page, not a dialog).

This is the one UI-restructuring task in this plan: the spec's UI surface map calls for the gear icon to route to a page instead of opening a dialog, so the Etsy connection section has somewhere to live and the OAuth callback has `/settings` to redirect back to.

- [ ] **Step 1: Add the route constant**

In `packages/web/src/constants/routes.ts`, add:

```typescript
export const SETTINGS_PAGE: NavRoute = {
    name: 'Settings',
    route: '/settings',
};
```

And add `SETTINGS_PAGE` to the `ROUTES` array export.

- [ ] **Step 2: Check available UI primitives**

Run: `ls packages/web/src/components/ui`
Expected: confirm whether a `card` component exists (e.g. `card.tsx`) — if so, use `Card`/`CardHeader`/`CardTitle`/`CardContent` in Step 3 below; if not, use plain `<section>` elements with the same Tailwind classes used elsewhere in the codebase (check `ViewDesign` page for the prevailing section style) and adjust Step 3's markup accordingly before implementing.

- [ ] **Step 3: Write the Settings page**

```typescript
// packages/web/src/pages/Settings/index.tsx
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

import { useUserSettings } from '../../hooks/useUserSettings';
import { useEtsyConnection } from '../../hooks/useEtsyConnection';

const Settings = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const etsyRedirectResult = searchParams.get('etsy');

    const { connected, shopName, broken, isLoading: etsyLoading, connect, isConnecting, disconnect, isDisconnecting } =
        useEtsyConnection();
    const { hourlyWage, profitMargin, updateSettings, recalculate, isLoading: pricingLoading } = useUserSettings();

    const [localWage, setLocalWage] = useState<number | ''>(hourlyWage);
    const [localMargin, setLocalMargin] = useState<number | ''>(profitMargin);
    const [pricingStatus, setPricingStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [pricingError, setPricingError] = useState('');

    useEffect(() => {
        setLocalWage(hourlyWage);
        setLocalMargin(profitMargin);
    }, [hourlyWage, profitMargin]);

    useEffect(() => {
        if (etsyRedirectResult) {
            const next = new URLSearchParams(searchParams);
            next.delete('etsy');
            setSearchParams(next, { replace: true });
        }
    }, [etsyRedirectResult]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleConnect = async () => {
        const { url } = await connect();
        window.location.href = url;
    };

    const handleSavePricing = async (thenRecalculate: boolean) => {
        const wage = Number(localWage);
        const margin = Number(localMargin);
        if (Number.isNaN(wage) || Number.isNaN(margin)) return;

        setPricingStatus('saving');
        try {
            await updateSettings({ hourlyWage: wage, profitMargin: margin });
            if (thenRecalculate) await recalculate();
            setPricingStatus('success');
        } catch (err) {
            setPricingError(err instanceof Error ? err.message : 'Unknown error');
            setPricingStatus('error');
        }
    };

    return (
        <div className="max-w-2xl space-y-8">
            <h1 className="text-2xl font-semibold">Settings</h1>

            {etsyRedirectResult === 'connected' && (
                <div className="flex items-center gap-2 rounded-md border border-green-500 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Etsy connected successfully.
                </div>
            )}
            {etsyRedirectResult === 'error' && (
                <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> Failed to connect to Etsy. Please try again.
                </div>
            )}

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Etsy Connection</h2>
                {etsyLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : connected ? (
                    <div className="space-y-2">
                        {broken && (
                            <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" /> Etsy connection needs to be re-authorized.
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                                {shopName} <ExternalLink className="h-3 w-3" />
                            </span>
                            <Button variant="outline" disabled={isDisconnecting} onClick={() => disconnect()}>
                                {isDisconnecting ? 'Disconnecting…' : broken ? 'Reconnect Etsy' : 'Disconnect'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button disabled={isConnecting} onClick={handleConnect}>
                        {isConnecting ? 'Redirecting…' : 'Connect Etsy'}
                    </Button>
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-medium">Pricing</h2>
                <div className="space-y-1.5">
                    <Label>Hourly Wage</Label>
                    <InputGroup className="max-w-[160px]">
                        <InputGroupAddon align="inline-start">
                            <InputGroupText>£</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                            type="number"
                            min="0"
                            step="0.50"
                            disabled={pricingLoading}
                            value={localWage}
                            onChange={(e) => setLocalWage(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupText>/hr</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </div>
                <div className="space-y-1.5">
                    <Label>Profit Margin</Label>
                    <InputGroup className="max-w-[140px]">
                        <InputGroupInput
                            type="number"
                            min="0"
                            step="1"
                            disabled={pricingLoading}
                            value={localMargin}
                            onChange={(e) => setLocalMargin(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupText>%</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => handleSavePricing(true)}>Save &amp; Recalculate All Designs</Button>
                    <Button variant="outline" onClick={() => handleSavePricing(false)}>
                        Save Only
                    </Button>
                </div>
                {pricingStatus === 'success' && <p className="text-sm text-green-600">Saved.</p>}
                {pricingStatus === 'error' && <p className="text-sm text-destructive">{pricingError}</p>}
            </section>
        </div>
    );
};

export default Settings;
```

- [ ] **Step 4: Register the route**

In `packages/web/src/index.tsx`, add the import:

```typescript
import Settings from './pages/Settings';
```

and add `SETTINGS_PAGE` to the destructured import from `./constants/routes`, then add the route element (same shape as the other protected routes):

```typescript
            <Route
                path={SETTINGS_PAGE.route}
                element={
                    <ProtectedRoute fallbackPath={START_PAGE.route}>
                        <MainLayout>
                            <Settings />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
```

- [ ] **Step 5: Point the gear icon at the new page**

In `packages/web/src/components/MainLayout/index.tsx`, remove the `UserSettingsDialog` import and its `<UserSettingsDialog />` usage, replacing the `<div className="ml-auto">` block with a plain nav button:

```typescript
import { Settings as SettingsIcon } from 'lucide-react';
```

```typescript
import { DESIGNS_PAGE, SETTINGS_PAGE } from '../../constants/routes';
```

```typescript
                    <div className="ml-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Settings"
                            onClick={() => navigate(SETTINGS_PAGE.route)}
                        >
                            <SettingsIcon className="h-5 w-5" />
                        </Button>
                    </div>
```

- [ ] **Step 6: Delete the old dialog**

```bash
rm -rf packages/web/src/components/UserSettingsDialog
```

- [ ] **Step 7: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: no errors (confirms nothing else imports `UserSettingsDialog`)

Run: `grep -rn "UserSettingsDialog" packages/web/src` — expected: no matches

- [ ] **Step 8: Manual smoke test**

Run: `bun run start:web` and `bun run start:api` (or `bun run start:with-mock` per repo convention — check root `package.json` scripts)
Navigate to `/settings`, confirm: Pricing section shows current wage/margin and Save works (same behavior as the old dialog); Etsy section shows "Connect Etsy" (since `.env` Etsy keys are still blank, clicking it will fail at the Etsy redirect step until Igor supplies real credentials and registers the callback URL — that's expected for now, just confirm the button fires the `/api/etsy/oauth/start` request and attempts to redirect)

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/pages/Settings packages/web/src/constants/routes.ts packages/web/src/index.tsx packages/web/src/components/MainLayout/index.tsx
git add -u packages/web/src/components/UserSettingsDialog
git commit -m "feat(web): add Settings page with Etsy connection section, retire settings dialog"
```

---

## Self-Review Notes

- **Spec coverage (sub-project 1 only):** Settings page + Connect button (Task 9) · all scopes requested up front (Task 6, `SCOPES` constant) · callback route exchanging code for tokens (Task 7) · `etsyConnections` collection shape matching the spec exactly (Task 1/5) · `EtsyClient` with colon `x-api-key`, bearer attach, auto-refresh <60s margin (Task 4/6) · broken-connection marking on refresh failure (Task 6) · shop id/name fetched via `getMe`/`getShop` at connect time (Task 6) · "Needed from Mari" callback URL registration called out explicitly (Task 2). Sub-projects 2–5 (maker docs, push-to-Etsy, status refresh, linking script) are out of scope for this plan by design — see the spec's build order.
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code or an exact command.
- **Type consistency:** `EtsyConnectionStatus` (Task 1) is the same shape returned by `EtsyConnectionService.getStatus` (Task 6), serialized by `getEtsyConnectionStatus` (Task 7), and consumed by `useEtsyConnection`/`Settings` (Tasks 8–9). `EtsyTokenResponse` (Task 4) is the sole shape `EtsyConnectionService` reads from `EtsyClient` (Task 6). Method names match end to end: `startAuthorization`, `handleCallback`, `getStatus`, `disconnect`, `getValidAccessToken`.
- **Known open item carried forward from the spec:** exact prod `WEB_APP_URL`/`ETSY_REDIRECT_URI` values need reading from dokploy before deploying this — Task 2 leaves them as local dev placeholders deliberately.
