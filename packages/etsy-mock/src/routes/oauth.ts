import { Hono } from 'hono';
import { html } from 'hono/html';
import { SCENARIOS, type Scenario } from '../fixtures';
import type { MockStore } from '../store';

const AUTH_PARAMS = [
    'response_type',
    'client_id',
    'redirect_uri',
    'scope',
    'state',
    'code_challenge',
    'code_challenge_method',
] as const;

const missingParam = (params: Record<string, string | undefined>) => {
    const missing = AUTH_PARAMS.find((p) => !params[p]);
    if (missing) return `Missing ${missing}`;
    if (params.response_type !== 'code') return 'response_type must be code';
    if (params.code_challenge_method !== 'S256') return 'code_challenge_method must be S256';
    return undefined;
};

export const oauthRoutes = (store: MockStore) => {
    const app = new Hono();

    app.get('/oauth/connect', (c) => {
        const params = c.req.query();
        const error = missingParam(params);
        if (error) return c.html(html`<h1>Bad authorisation request</h1><p>${error}</p>`, 400);

        const accounts = [...store.users.values()].map((u) => ({
            userId: u.userId,
            label: u.shopId
                ? (store.shops.get(u.shopId)?.shopName ?? `Shop ${u.shopId}`)
                : `User ${u.userId} (no shop)`,
        }));

        return c.html(html`<!doctype html>
            <html>
                <head><title>Mock Etsy – grant access</title></head>
                <body style="font-family: sans-serif; max-width: 32rem; margin: 2rem auto">
                    <h1>Mock Etsy</h1>
                    <p>An app is asking for: <code>${params.scope}</code></p>
                    <form method="post" action="/oauth/connect">
                        ${AUTH_PARAMS.map((p) => html`<input type="hidden" name="${p}" value="${params[p]}" />`)}
                        <fieldset>
                            <legend>Sign in as</legend>
                            ${accounts.map(
                                (a) =>
                                    html`<label><input type="radio" name="account" value="${a.userId}" /> ${a.label}</label><br />`
                            )}
                            <label><input type="radio" name="account" value="new" checked /> New shop</label>
                            <br />
                            <label>Shop name <input name="shop_name" /></label>
                            <label>
                                Scenario
                                <select name="scenario">
                                    ${SCENARIOS.map((s) => html`<option value="${s}">${s}</option>`)}
                                </select>
                            </label>
                        </fieldset>
                        <button name="decision" value="allow">Allow access</button>
                        <button name="decision" value="deny">Deny</button>
                    </form>
                </body>
            </html>`);
    });

    app.post('/oauth/connect', async (c) => {
        const form = Object.fromEntries(
            [...(await c.req.formData()).entries()].map(([k, v]) => [k, String(v)])
        ) as Record<string, string>;
        const error = missingParam(form);
        if (error) return c.html(html`<h1>Bad authorisation request</h1><p>${error}</p>`, 400);

        const redirect = new URL(form.redirect_uri);
        redirect.searchParams.set('state', form.state);
        if (form.decision !== 'allow') {
            redirect.searchParams.set('error', 'access_denied');
            return c.redirect(redirect.toString(), 302);
        }

        const userId =
            form.account === 'new' || !form.account
                ? store.createUser({ shopName: form.shop_name, scenario: (form.scenario as Scenario) ?? 'established' })
                      .userId
                : Number(form.account);

        redirect.searchParams.set(
            'code',
            store.issueCode({
                userId,
                codeChallenge: form.code_challenge,
                redirectUri: form.redirect_uri,
                scopes: form.scope.split(' '),
            })
        );
        return c.redirect(redirect.toString(), 302);
    });

    app.post('/v3/public/oauth/token', async (c) => {
        const body = Object.fromEntries(new URLSearchParams(await c.req.text()));
        const result =
            body.grant_type === 'authorization_code'
                ? store.exchangeCode({
                      code: body.code,
                      codeVerifier: body.code_verifier,
                      redirectUri: body.redirect_uri,
                  })
                : body.grant_type === 'refresh_token'
                  ? (store.refresh(body.refresh_token) ?? 'invalid_grant: unknown refresh token')
                  : 'unsupported_grant_type';
        if (typeof result === 'string') return c.json({ error: result }, 400);
        return c.json({
            access_token: result.accessToken,
            token_type: 'Bearer',
            expires_in: store.tokenTtlSeconds,
            refresh_token: result.refreshToken,
        });
    });

    return app;
};
