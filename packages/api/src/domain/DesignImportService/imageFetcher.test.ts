import { describe, expect, it, mock } from 'bun:test';
import { HttpEtsyImageFetcher, isAllowedEtsyUrl } from './imageFetcher';

describe('imageFetcher', () => {
    it('allows only https i.etsystatic.com', () => {
        expect(isAllowedEtsyUrl('https://i.etsystatic.com/1/il/a/1/il_x.jpg')).toBe(true);
        expect(isAllowedEtsyUrl('http://i.etsystatic.com/x.jpg')).toBe(false);
        expect(isAllowedEtsyUrl('https://evil.com/x.jpg')).toBe(false);
        expect(isAllowedEtsyUrl('not a url')).toBe(false);
    });

    it('rejects disallowed hosts before fetching', async () => {
        const fetcher = new HttpEtsyImageFetcher();
        await expect(fetcher.fetch('https://evil.com/x.jpg')).rejects.toThrow(/host/i);
    });

    it('returns buffer and content type on success', async () => {
        const fakeFetch = mock(
            async () =>
                new Response(new Uint8Array([1, 2, 3]), {
                    headers: { 'content-type': 'image/jpeg' },
                })
        );
        const fetcher = new HttpEtsyImageFetcher(fakeFetch as unknown as typeof fetch);
        const res = await fetcher.fetch('https://i.etsystatic.com/1/il/a/1/il_x.jpg');
        expect(res.contentType).toBe('image/jpeg');
        expect(res.buffer.length).toBe(3);
    });
});
