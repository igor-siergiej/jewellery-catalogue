import { describe, expect, it } from 'bun:test';
import * as imageHandlers from './index';

describe('Image Handlers', () => {
    it('should export getImage', () => {
        expect(imageHandlers.getImage).toBeDefined();
        expect(typeof imageHandlers.getImage).toBe('function');
    });
});
