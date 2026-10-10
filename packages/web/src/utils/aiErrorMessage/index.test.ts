import { describe, expect, it } from 'vitest';

import { aiErrorMessage } from '.';

describe('aiErrorMessage', () => {
    it('explains the usage limit on 429', () => {
        expect(aiErrorMessage(new Error('Response was not ok 429: Too Many Requests'), 'x')).toContain('usage limit');
    });

    it('explains missing setup on 503', () => {
        expect(aiErrorMessage(new Error('Response was not ok 503: Service Unavailable'), 'x')).toContain('FAL_KEY');
    });

    it('falls back for anything else', () => {
        expect(aiErrorMessage(new Error('Response was not ok 502: Bad Gateway'), 'Try again.')).toBe('Try again.');
    });
});
