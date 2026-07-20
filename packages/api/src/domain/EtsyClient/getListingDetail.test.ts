import { afterEach, describe, expect, it, mock } from 'bun:test';
import { EtsyClient } from './index';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe('EtsyClient.getListingDetail', () => {
    it('fetches a listing with images and maps title, description, price and image urls', async () => {
        const fetchMock = mock(
            async () =>
                new Response(
                    JSON.stringify({
                        listing_id: 123,
                        title: 'Silver Ring',
                        description: 'A lovely ring.',
                        price: { amount: 2500, divisor: 100 },
                        images: [
                            { url_fullxfull: 'https://i.etsy.com/1.jpg' },
                            { url_fullxfull: 'https://i.etsy.com/2.jpg' },
                        ],
                    }),
                    { status: 200 }
                )
        );
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const client = new EtsyClient('key', 'secret');
        const detail = await client.getListingDetail(123);

        expect(detail).toEqual({
            title: 'Silver Ring',
            description: 'A lovely ring.',
            price: 25,
            imageUrls: ['https://i.etsy.com/1.jpg', 'https://i.etsy.com/2.jpg'],
        });
        const calledUrl = fetchMock.mock.calls[0]![0] as string;
        expect(calledUrl).toBe('https://api.etsy.com/v3/application/listings/123?includes=Images');
    });

    it('returns empty imageUrls when the listing has no images', async () => {
        globalThis.fetch = mock(
            async () =>
                new Response(
                    JSON.stringify({
                        listing_id: 5,
                        title: 'T',
                        description: 'D',
                        price: { amount: 999, divisor: 100 },
                    }),
                    { status: 200 }
                )
        ) as unknown as typeof fetch;

        const client = new EtsyClient('key', 'secret');
        const detail = await client.getListingDetail(5);
        expect(detail.imageUrls).toEqual([]);
        expect(detail.price).toBe(9.99);
    });

    it('throws when the Etsy response is not ok', async () => {
        globalThis.fetch = mock(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
        const client = new EtsyClient('key', 'secret');
        await expect(client.getListingDetail(7)).rejects.toThrow();
    });
});
