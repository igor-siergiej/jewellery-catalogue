import { createHash, randomBytes } from 'node:crypto';

const AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect';
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const API_BASE = 'https://api.etsy.com/v3/application';

export interface EtsyTokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface EtsyDraftListingInput {
    title: string;
    description: string;
    price: number;
    quantity: number;
    whoMade: string;
    whenMade: string;
    taxonomyId: number;
}

export interface EtsyListingResult {
    listingId: number;
}

export interface EtsyInventoryProduct {
    propertyValues: Array<{ propertyName: string; values: string[] }>;
    offering: { price: number; quantity: number; isEnabled: boolean };
}

export interface EtsyTaxonomyNode {
    id: number;
    name: string;
    children: EtsyTaxonomyNode[];
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

    async createDraftListing(
        accessToken: string,
        shopId: number,
        input: EtsyDraftListingInput
    ): Promise<EtsyListingResult> {
        const response = await fetch(`${API_BASE}/shops/${shopId}/listings`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKeyHeader(),
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quantity: input.quantity,
                title: input.title,
                description: input.description,
                price: input.price,
                who_made: input.whoMade,
                when_made: input.whenMade,
                taxonomy_id: input.taxonomyId,
            }),
        });

        if (!response.ok) {
            throw new Error(`Etsy createDraftListing failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as { listing_id: number };
        return { listingId: body.listing_id };
    }

    async uploadListingImage(
        accessToken: string,
        shopId: number,
        listingId: number,
        image: { buffer: Buffer; contentType: string; filename: string },
        rank: number
    ): Promise<void> {
        const form = new FormData();
        form.append('image', new Blob([image.buffer], { type: image.contentType }), image.filename);
        form.append('rank', String(rank));

        const response = await fetch(`${API_BASE}/shops/${shopId}/listings/${listingId}/images`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKeyHeader(),
                Authorization: `Bearer ${accessToken}`,
            },
            body: form,
        });

        if (!response.ok) {
            throw new Error(`Etsy uploadListingImage failed: ${response.status} ${await response.text()}`);
        }
    }

    async getListingImages(accessToken: string, listingId: number): Promise<{ imageIds: number[] }> {
        const response = await fetch(`${API_BASE}/listings/${listingId}/images`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`Etsy getListingImages failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as { results: Array<{ listing_image_id: number }> };
        return { imageIds: body.results.map((r) => r.listing_image_id) };
    }

    async updateListingInventory(
        accessToken: string,
        listingId: number,
        products: EtsyInventoryProduct[]
    ): Promise<void> {
        const response = await fetch(`${API_BASE}/listings/${listingId}/inventory`, {
            method: 'PUT',
            headers: {
                'x-api-key': this.apiKeyHeader(),
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                products: products.map((p) => ({
                    property_values: p.propertyValues.map((pv) => ({
                        property_id: null,
                        property_name: pv.propertyName,
                        values: pv.values,
                    })),
                    offerings: [
                        {
                            price: p.offering.price,
                            quantity: p.offering.quantity,
                            is_enabled: p.offering.isEnabled,
                        },
                    ],
                })),
            }),
        });

        if (!response.ok) {
            throw new Error(`Etsy updateListingInventory failed: ${response.status} ${await response.text()}`);
        }
    }

    async getSellerTaxonomyNodes(): Promise<EtsyTaxonomyNode[]> {
        const response = await fetch(`${API_BASE}/seller-taxonomy/nodes`, {
            headers: { 'x-api-key': this.apiKeyHeader() },
        });

        if (!response.ok) {
            throw new Error(`Etsy getSellerTaxonomyNodes failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as {
            results: Array<{ id: number; name: string; children?: unknown[] }>;
        };

        const mapNode = (n: { id: number; name: string; children?: unknown[] }): EtsyTaxonomyNode => ({
            id: n.id,
            name: n.name,
            children: ((n.children ?? []) as Array<{ id: number; name: string; children?: unknown[] }>).map(mapNode),
        });

        return body.results.map(mapNode);
    }
}
