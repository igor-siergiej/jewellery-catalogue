import { describe, expect, it } from 'bun:test';

import { EtsyOAuthStateStore } from './index';

describe('EtsyOAuthStateStore', () => {
    it('returns saved data on first consume', () => {
        const store = new EtsyOAuthStateStore();
        store.save('state-1', { userId: 'user-1', codeVerifier: 'verifier-1' });

        expect(store.consume('state-1')).toEqual({ userId: 'user-1', codeVerifier: 'verifier-1' });
    });

    it('is single-use — second consume returns null', () => {
        const store = new EtsyOAuthStateStore();
        store.save('state-1', { userId: 'user-1', codeVerifier: 'verifier-1' });

        store.consume('state-1');

        expect(store.consume('state-1')).toBeNull();
    });

    it('returns null for an unknown state', () => {
        const store = new EtsyOAuthStateStore();

        expect(store.consume('never-saved')).toBeNull();
    });

    it('returns null once the entry has expired', () => {
        const store = new EtsyOAuthStateStore(-1); // negative TTL: already expired the instant it's saved
        store.save('state-1', { userId: 'user-1', codeVerifier: 'verifier-1' });

        expect(store.consume('state-1')).toBeNull();
    });
});
