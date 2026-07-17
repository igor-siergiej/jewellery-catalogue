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

    async exchangeCodeForToken(args: {
        code: string;
        codeVerifier: string;
        redirectUri: string;
    }): Promise<EtsyTokenResponse> {
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
