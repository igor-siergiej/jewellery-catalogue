import { describe, expect, it } from 'vitest';

import { addTokenToImageUrls, getImageSrc } from '.';

describe('getImageSrc', () => {
    it('appends the token as a query param', () => {
        expect(getImageSrc('abc123', 'tok.en')).toBe('/api/image/abc123?token=tok.en');
    });

    it('omits the token when not available', () => {
        expect(getImageSrc('abc123', null)).toBe('/api/image/abc123');
    });

    it('requests a resized image when a size is given', () => {
        expect(getImageSrc('abc123', 'tok.en', 'thumb')).toBe('/api/image/abc123?size=thumb&token=tok.en');
        expect(getImageSrc('abc123', null, 'display')).toBe('/api/image/abc123?size=display');
    });
});

describe('addTokenToImageUrls', () => {
    it('adds the token to every image url in the html', () => {
        const html = '<img src="/api/image/aaa"><p>x</p><img src="/api/image/bbb">';

        expect(addTokenToImageUrls(html, 't')).toBe(
            '<img src="/api/image/aaa?token=t"><p>x</p><img src="/api/image/bbb?token=t">'
        );
    });

    it('does not double-append when a token is already present', () => {
        const html = '<img src="/api/image/aaa?token=old">';

        expect(addTokenToImageUrls(html, 't')).toBe(html);
    });

    it('returns html unchanged without a token', () => {
        const html = '<img src="/api/image/aaa">';

        expect(addTokenToImageUrls(html, undefined)).toBe(html);
    });
});
