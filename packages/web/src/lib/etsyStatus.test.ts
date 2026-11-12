import { describe, expect, it } from 'vite-plus/test';

import { ETSY_STATUS_LABEL, getEtsyAction, getEtsyStatus, isNotOnEtsyYet } from './etsyStatus';

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

const linked = (state: 'draft' | 'active' | 'inactive', extra: object = {}) =>
    ({ etsy: { listingId: 1, state, ...extra } }) as never;

describe('getEtsyAction', () => {
    it('explains catalogue-only designs whatever their status', () => {
        expect(getEtsyAction({ catalogueOnly: true }, true)).toEqual(['catalogue-only']);
        expect(getEtsyAction({ ...linked('active'), catalogueOnly: true } as never, true)).toEqual(['catalogue-only']);
    });

    it('offers Send to Etsy for an unlinked design only when connected', () => {
        expect(getEtsyAction({}, true)).toEqual(['send']);
        expect(getEtsyAction({}, false)).toEqual([]);
    });

    it('links to a draft that was fully pushed instead of offering a second push', () => {
        expect(getEtsyAction(linked('draft'), true)).toEqual(['view']);
    });

    it.each(['draft', 'active', 'inactive'] as const)(
        'offers Send to Etsy and the link for a %s listing with an incomplete push',
        (state) => {
            expect(getEtsyAction(linked(state, { pushIncomplete: true }), true)).toEqual(['send', 'view']);
        }
    );

    it('cannot send an incomplete push when Etsy is not connected, but still links', () => {
        expect(getEtsyAction(linked('active', { pushIncomplete: true }), false)).toEqual(['view']);
    });

    it('links to listed and inactive listings, connected or not', () => {
        expect(getEtsyAction(linked('active'), true)).toEqual(['view']);
        expect(getEtsyAction(linked('active'), false)).toEqual(['view']);
        expect(getEtsyAction(linked('inactive'), false)).toEqual(['view']);
    });

    it('has no action for an inactive design without a listing id', () => {
        expect(getEtsyAction({ etsy: { state: 'inactive' } } as never, true)).toEqual([]);
    });

    it('offers Send to Etsy for a draft without a listing id', () => {
        expect(getEtsyAction({ etsy: { state: 'draft' } } as never, true)).toEqual(['send']);
    });
});
