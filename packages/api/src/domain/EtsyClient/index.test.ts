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
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));

            await expect(
                client.exchangeCodeForToken({ code: 'bad', codeVerifier: 'v', redirectUri: 'https://x' })
            ).rejects.toThrow();
        });
    });

    describe('refreshAccessToken', () => {
        it('posts refresh_token grant and maps the response', async () => {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ access_token: 'at2', refresh_token: 'rt2', expires_in: 3600 }), {
                    status: 200,
                })
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

    describe('createDraftListing', () => {
        it('posts the mapped body to the shop listings endpoint and maps the response', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ listing_id: 999 }), { status: 200 }));

            const result = await client.createDraftListing('at-token', 47408839, {
                title: 'Silver Ring',
                description: 'A lovely ring.',
                price: 25.5,
                quantity: 3,
                whoMade: 'i_did',
                whenMade: 'made_to_order',
                isSupply: false,
                taxonomyId: 1234,
                shippingProfileId: 5678,
                readinessStateId: 4321,
            });

            expect(result).toEqual({ listingId: 999 });

            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839/listings');
            expect(options.method).toBe('POST');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
            expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
            const body = JSON.parse(options.body as string);
            expect(body).toEqual({
                quantity: 3,
                title: 'Silver Ring',
                description: 'A lovely ring.',
                price: 25.5,
                who_made: 'i_did',
                when_made: 'made_to_order',
                is_supply: false,
                type: 'physical',
                taxonomy_id: 1234,
                shipping_profile_id: 5678,
                readiness_state_id: 4321,
            });
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'bad taxonomy' }), { status: 400 }));

            await expect(
                client.createDraftListing('at', 1, {
                    title: 't',
                    description: 'd',
                    price: 1,
                    quantity: 1,
                    whoMade: 'i_did',
                    whenMade: 'made_to_order',
                    isSupply: false,
                    taxonomyId: 1,
                    shippingProfileId: 1,
                    readinessStateId: 1,
                })
            ).rejects.toThrow();
        });
    });

    describe('getShopShippingProfiles', () => {
        it('fetches and maps the shop shipping profiles', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({
                        results: [
                            { shipping_profile_id: 1, title: 'Standard' },
                            { shipping_profile_id: 2, title: 'Express' },
                        ],
                    }),
                    { status: 200 }
                )
            );

            const result = await client.getShopShippingProfiles('at-token', 47408839);

            expect(result).toEqual([
                { shippingProfileId: 1, title: 'Standard' },
                { shippingProfileId: 2, title: 'Express' },
            ]);
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839/shipping-profiles');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));

            await expect(client.getShopShippingProfiles('at', 1)).rejects.toThrow();
        });
    });

    describe('getShopReadinessStateDefinitions', () => {
        it('fetches and maps the shop readiness state definitions', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({
                        results: [
                            { readiness_state_id: 1, readiness_state: 'ready_to_ship' },
                            { readiness_state_id: 2, readiness_state: 'made_to_order' },
                        ],
                    }),
                    { status: 200 }
                )
            );

            const result = await client.getShopReadinessStateDefinitions('at-token', 47408839);

            expect(result).toEqual([
                { readinessStateId: 1, readinessState: 'ready_to_ship' },
                { readinessStateId: 2, readinessState: 'made_to_order' },
            ]);
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839/readiness-state-definitions');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));

            await expect(client.getShopReadinessStateDefinitions('at', 1)).rejects.toThrow();
        });
    });

    describe('uploadListingImage', () => {
        it('posts a multipart form with the image and rank', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ listing_image_id: 1 }), { status: 200 }));

            await client.uploadListingImage(
                'at-token',
                47408839,
                999,
                { buffer: Buffer.from('fake-image-bytes'), contentType: 'image/png', filename: 'photo.png' },
                1
            );

            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839/listings/999/images');
            expect(options.method).toBe('POST');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
            expect(options.body).toBeInstanceOf(FormData);
            const form = options.body as FormData;
            expect(form.get('rank')).toBe('1');
            expect(form.get('image')).toBeInstanceOf(Blob);
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));

            await expect(
                client.uploadListingImage(
                    'at',
                    1,
                    1,
                    { buffer: Buffer.from('x'), contentType: 'image/png', filename: 'x.png' },
                    0
                )
            ).rejects.toThrow();
        });
    });

    describe('getListingImages', () => {
        it('fetches and maps the listing image ids', async () => {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ results: [{ listing_image_id: 111 }, { listing_image_id: 222 }] }), {
                    status: 200,
                })
            );

            const result = await client.getListingImages('at-token', 999);

            expect(result).toEqual({ imageIds: [111, 222] });
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/listings/999/images');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
        });
    });

    describe('updateListingInventory', () => {
        it('maps property values and offerings into the Etsy inventory body', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

            await client.updateListingInventory('at-token', 999, [
                {
                    propertyValues: [{ propertyName: 'Colour', values: ['Silver'] }],
                    offering: { price: 25.5, quantity: 3, isEnabled: true },
                },
            ]);

            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/listings/999/inventory');
            expect(options.method).toBe('PUT');
            const body = JSON.parse(options.body as string);
            expect(body).toEqual({
                products: [
                    {
                        property_values: [{ property_id: null, property_name: 'Colour', values: ['Silver'] }],
                        offerings: [{ price: 25.5, quantity: 3, is_enabled: true }],
                    },
                ],
            });
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 400 }));

            await expect(client.updateListingInventory('at', 1, [])).rejects.toThrow();
        });
    });

    describe('getSellerTaxonomyNodes', () => {
        it('fetches and maps the nested taxonomy tree', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({
                        results: [
                            {
                                id: 1,
                                name: 'Jewelry',
                                children: [{ id: 2, name: 'Rings', children: [] }],
                            },
                        ],
                    }),
                    { status: 200 }
                )
            );

            const result = await client.getSellerTaxonomyNodes();

            expect(result).toEqual([{ id: 1, name: 'Jewelry', children: [{ id: 2, name: 'Rings', children: [] }] }]);
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/seller-taxonomy/nodes');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
        });
    });

    describe('getListing', () => {
        it('fetches the listing and maps a draft state through unchanged', async () => {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ listing_id: 999, state: 'draft' }), { status: 200 })
            );

            const result = await client.getListing('at-token', 999);

            expect(result).toEqual({ listingId: 999, state: 'draft' });
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/listings/999');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
        });

        it('maps an active state through unchanged', async () => {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ listing_id: 999, state: 'active' }), { status: 200 })
            );

            const result = await client.getListing('at-token', 999);

            expect(result).toEqual({ listingId: 999, state: 'active' });
        });

        it.each(['inactive', 'sold_out', 'expired'])('maps Etsy state "%s" down to "inactive"', async (etsyState) => {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ listing_id: 999, state: etsyState }), { status: 200 })
            );

            const result = await client.getListing('at-token', 999);

            expect(result).toEqual({ listingId: 999, state: 'inactive' });
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));

            await expect(client.getListing('at', 1)).rejects.toThrow();
        });
    });

    describe('getShopListingsActive', () => {
        it('fetches a single page when count fits within the page limit', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({
                        count: 2,
                        results: [
                            {
                                listing_id: 1,
                                title: 'Silver Ring',
                                price: { amount: 2550, divisor: 100, currency_code: 'GBP' },
                                url: 'https://etsy.com/listing/1',
                            },
                            {
                                listing_id: 2,
                                title: 'Gold Ring',
                                price: { amount: 4000, divisor: 100, currency_code: 'GBP' },
                                url: 'https://etsy.com/listing/2',
                            },
                        ],
                    }),
                    { status: 200 }
                )
            );

            const result = await client.getShopListingsActive(47408839);

            expect(result).toEqual([
                { listingId: 1, title: 'Silver Ring', price: 25.5, url: 'https://etsy.com/listing/1' },
                { listingId: 2, title: 'Gold Ring', price: 40, url: 'https://etsy.com/listing/2' },
            ]);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839/listings/active?limit=100&offset=0');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBeUndefined();
        });

        it('paginates when count exceeds the 100-item page limit', async () => {
            const page = (start: number, count: number, total: number) => ({
                count: total,
                results: Array.from({ length: count }, (_, i) => ({
                    listing_id: start + i,
                    title: `Listing ${start + i}`,
                    price: { amount: 1000, divisor: 100, currency_code: 'GBP' },
                    url: `https://etsy.com/listing/${start + i}`,
                })),
            });

            fetchMock
                .mockResolvedValueOnce(new Response(JSON.stringify(page(1, 100, 102)), { status: 200 }))
                .mockResolvedValueOnce(new Response(JSON.stringify(page(101, 2, 102)), { status: 200 }));

            const result = await client.getShopListingsActive(47408839);

            expect(result).toHaveLength(102);
            expect(fetchMock).toHaveBeenCalledTimes(2);
            const [firstUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
            const [secondUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
            expect(firstUrl).toBe(
                'https://api.etsy.com/v3/application/shops/47408839/listings/active?limit=100&offset=0'
            );
            expect(secondUrl).toBe(
                'https://api.etsy.com/v3/application/shops/47408839/listings/active?limit=100&offset=100'
            );
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));

            await expect(client.getShopListingsActive(1)).rejects.toThrow();
        });
    });
});
