import { describe, expect, it } from 'vite-plus/test';

import { ETSY_STATUS_LABEL, getEtsyStatus, isNotOnEtsyYet } from './etsyStatus';

const etsy = (state: 'draft' | 'active' | 'inactive') => ({ etsy: { state } }) as never;

describe('getEtsyStatus', () => {
    it('is none without etsy', () => expect(getEtsyStatus({})).toBe('none'));
    it('maps draft', () => expect(getEtsyStatus(etsy('draft'))).toBe('draft'));
    it('maps active to listed', () => expect(getEtsyStatus(etsy('active'))).toBe('listed'));
    it('maps inactive', () => expect(getEtsyStatus(etsy('inactive'))).toBe('inactive'));
});

describe('isNotOnEtsyYet', () => {
    it('false for catalogue only', () => expect(isNotOnEtsyYet({ catalogueOnly: true })).toBe(false));
    it('true with no etsy', () => expect(isNotOnEtsyYet({})).toBe(true));
    it('false with etsy', () => expect(isNotOnEtsyYet(etsy('draft'))).toBe(false));
});

describe('ETSY_STATUS_LABEL', () => {
    it('has human labels', () => {
        expect(ETSY_STATUS_LABEL).toEqual({
            none: 'Not on Etsy',
            draft: 'Etsy draft',
            listed: 'Listed',
            inactive: 'Inactive',
        });
    });
});
