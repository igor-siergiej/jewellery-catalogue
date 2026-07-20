import { describe, expect, it } from 'bun:test';
import * as etsyHandlers from './index';

describe('Etsy reconcile handlers', () => {
    it('exports createDesignFromEtsyListing', () => {
        expect(typeof etsyHandlers.createDesignFromEtsyListing).toBe('function');
    });
    it('exports linkEtsyListingToDesign', () => {
        expect(typeof etsyHandlers.linkEtsyListingToDesign).toBe('function');
    });
});
