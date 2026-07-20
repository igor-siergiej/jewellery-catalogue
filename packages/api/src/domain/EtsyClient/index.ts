import { createHash, randomBytes } from 'node:crypto';
import { APIError } from '@imapps/api-utils/hono';
import type { EtsyListingState } from '@jewellery-catalogue/types';

// Etsy failures are surfaced as 502 (not the upstream status) so they can't collide with
// our own 401/403 semantics — the web client treats any "401" in an error message as its
// own JWT expiring and tries to refresh/logout, which must not fire for Etsy-side auth issues.
const etsyError = async (op: string, response: Response): Promise<APIError> =>
    new APIError(`Etsy ${op} failed: ${response.status} ${await response.text()}`, 502);

const AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect';
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const API_BASE = 'https://api.etsy.com/v3/application';
const SHOP_LISTINGS_PAGE_LIMIT = 100;

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
    isSupply: boolean;
    taxonomyId: number;
    shippingProfileId: number;
    readinessStateId: number;
}

export interface EtsyListingResult {
    listingId: number;
}

export interface EtsyShippingProfile {
    shippingProfileId: number;
    title: string;
}

export interface EtsyReadinessStateDefinition {
    readinessStateId: number;
    readinessState: 'ready_to_ship' | 'made_to_order';
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

export interface EtsyListingStatus {
    listingId: number;
    state: EtsyListingState;
    quantity: number;
}

export interface EtsyListingSummary {
    listingId: number;
    title: string;
    price: number;
    url: string;
}

export type EtsyShopListingState = 'active' | 'sold_out';

export interface EtsyShopListingSummary extends EtsyListingSummary {
    state: EtsyShopListingState;
    imageUrl: string | null;
}

export interface EtsyListingDetail {
    title: string;
    description: string;
    price: number;
    imageUrls: string[];
}

export interface EtsyInventoryProductOffering {
    price: number;
    quantity: number;
    isEnabled: boolean;
}

export interface EtsyInventoryPropertyValue {
    propertyName: string;
    values: string[];
}

export interface EtsyInventoryProductResult {
    offerings: EtsyInventoryProductOffering[];
    propertyValues: EtsyInventoryPropertyValue[];
}

export interface EtsyListingInventory {
    products: EtsyInventoryProductResult[];
}

const mapListingState = (state: string): EtsyListingState =>
    state === 'draft' || state === 'active' ? state : 'inactive';

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
            throw await etsyError('token request', response);
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
            throw await etsyError('getMe', response);
        }

        const body = (await response.json()) as { user_id: number; shop_id: number };
        return { userId: body.user_id, shopId: body.shop_id };
    }

    async getShop(shopId: number): Promise<{ shopId: number; shopName: string }> {
        const response = await fetch(`${API_BASE}/shops/${shopId}`, {
            headers: { 'x-api-key': this.apiKeyHeader() },
        });

        if (!response.ok) {
            throw await etsyError('getShop', response);
        }

        const body = (await response.json()) as { shop_id: number; shop_name: string };
        return { shopId: body.shop_id, shopName: body.shop_name };
    }

    async getListing(accessToken: string, listingId: number): Promise<EtsyListingStatus> {
        const response = await fetch(`${API_BASE}/listings/${listingId}`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw await etsyError('getListing', response);
        }

        const body = (await response.json()) as { listing_id: number; state: string; quantity: number };
        return { listingId: body.listing_id, state: mapListingState(body.state), quantity: body.quantity };
    }

    async getListingDetail(listingId: number): Promise<EtsyListingDetail> {
        const response = await fetch(`${API_BASE}/listings/${listingId}?includes=Images`, {
            headers: { 'x-api-key': this.apiKeyHeader() },
        });

        if (!response.ok) {
            throw await etsyError('getListingDetail', response);
        }

        const body = (await response.json()) as {
            title: string;
            description: string;
            price: { amount: number; divisor: number };
            images?: Array<{ url_fullxfull: string }>;
        };

        return {
            title: body.title,
            description: body.description,
            price: body.price.amount / body.price.divisor,
            imageUrls: (body.images ?? []).map((img) => img.url_fullxfull),
        };
    }

    async getListingInventory(accessToken: string, listingId: number): Promise<EtsyListingInventory> {
        const response = await fetch(`${API_BASE}/listings/${listingId}/inventory`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw await etsyError('getListingInventory', response);
        }

        const body = (await response.json()) as {
            products: Array<{
                offerings: Array<{ price: { amount: number; divisor: number }; quantity: number; is_enabled: boolean }>;
                property_values: Array<{ property_name: string; values: string[] }>;
            }>;
        };

        return {
            products: body.products.map((p) => ({
                offerings: p.offerings.map((o) => ({
                    price: o.price.amount / o.price.divisor,
                    quantity: o.quantity,
                    isEnabled: o.is_enabled,
                })),
                propertyValues: p.property_values.map((pv) => ({ propertyName: pv.property_name, values: pv.values })),
            })),
        };
    }

    async getShopListingsByState(
        accessToken: string,
        shopId: number,
        state: EtsyShopListingState
    ): Promise<EtsyShopListingSummary[]> {
        const results: EtsyShopListingSummary[] = [];
        let offset = 0;

        for (;;) {
            const response = await fetch(
                `${API_BASE}/shops/${shopId}/listings?state=${state}&includes=Images&limit=${SHOP_LISTINGS_PAGE_LIMIT}&offset=${offset}`,
                { headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` } }
            );

            if (!response.ok) {
                throw await etsyError('getShopListingsByState', response);
            }

            const body = (await response.json()) as {
                count: number;
                results: Array<{
                    listing_id: number;
                    title: string;
                    price: { amount: number; divisor: number };
                    url: string;
                    images?: Array<{ url_75x75: string }>;
                }>;
            };

            results.push(
                ...body.results.map((r) => ({
                    listingId: r.listing_id,
                    title: r.title,
                    price: r.price.amount / r.price.divisor,
                    url: r.url,
                    state,
                    imageUrl: r.images?.[0]?.url_75x75 ?? null,
                }))
            );

            offset += SHOP_LISTINGS_PAGE_LIMIT;
            if (offset >= body.count || body.results.length < SHOP_LISTINGS_PAGE_LIMIT) break;
        }

        return results;
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
                is_supply: input.isSupply,
                type: 'physical',
                taxonomy_id: input.taxonomyId,
                shipping_profile_id: input.shippingProfileId,
                readiness_state_id: input.readinessStateId,
            }),
        });

        if (!response.ok) {
            throw await etsyError('createDraftListing', response);
        }

        const body = (await response.json()) as { listing_id: number };
        return { listingId: body.listing_id };
    }

    async getShopShippingProfiles(accessToken: string, shopId: number): Promise<EtsyShippingProfile[]> {
        const response = await fetch(`${API_BASE}/shops/${shopId}/shipping-profiles`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw await etsyError('getShopShippingProfiles', response);
        }

        const body = (await response.json()) as {
            results: Array<{ shipping_profile_id: number; title: string }>;
        };
        return body.results.map((r) => ({ shippingProfileId: r.shipping_profile_id, title: r.title }));
    }

    async getShopReadinessStateDefinitions(
        accessToken: string,
        shopId: number
    ): Promise<EtsyReadinessStateDefinition[]> {
        const response = await fetch(`${API_BASE}/shops/${shopId}/readiness-state-definitions`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw await etsyError('getShopReadinessStateDefinitions', response);
        }

        const body = (await response.json()) as {
            results: Array<{ readiness_state_id: number; readiness_state: 'ready_to_ship' | 'made_to_order' }>;
        };
        return body.results.map((r) => ({ readinessStateId: r.readiness_state_id, readinessState: r.readiness_state }));
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
            throw await etsyError('uploadListingImage', response);
        }
    }

    async getListingImages(accessToken: string, listingId: number): Promise<{ imageIds: number[] }> {
        const response = await fetch(`${API_BASE}/listings/${listingId}/images`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw await etsyError('getListingImages', response);
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
            throw await etsyError('updateListingInventory', response);
        }
    }

    // fallow-ignore-next-line unused-class-member
    async getSellerTaxonomyNodes(): Promise<EtsyTaxonomyNode[]> {
        const response = await fetch(`${API_BASE}/seller-taxonomy/nodes`, {
            headers: { 'x-api-key': this.apiKeyHeader() },
        });

        if (!response.ok) {
            throw await etsyError('getSellerTaxonomyNodes', response);
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
