import { describe, expect, it } from 'bun:test';
import { MockStore } from './store';

describe('MockStore', () => {
    it('creates an established shop with listings in every state the app reads', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Bead Shop', scenario: 'established' });

        expect(user.shopId).not.toBeNull();
        const shop = store.shops.get(user.shopId as number);
        expect(shop?.shopName).toBe('Bead Shop');
        expect(shop?.shippingProfiles).toHaveLength(1);
        const states = [...store.listings.values()].map((l) => l.state);
        expect(states).toEqual(expect.arrayContaining(['active', 'sold_out', 'draft', 'inactive']));
        expect([...store.receipts.values()].length).toBeGreaterThan(0);
    });

    it('creates a user without a shop for the no-shop scenario', () => {
        const store = new MockStore();
        const user = store.createUser({ scenario: 'no-shop' });
        expect(user.shopId).toBeNull();
        expect(store.shops.size).toBe(0);
    });

    it('gives every new user a separate shop', () => {
        const store = new MockStore();
        const a = store.createUser({ scenario: 'empty' });
        const b = store.createUser({ scenario: 'empty' });
        expect(a.shopId).not.toBe(b.shopId);
    });

    it('gives the two-shipping-profiles scenario two profiles', () => {
        const store = new MockStore();
        const user = store.createUser({ scenario: 'two-shipping-profiles' });
        expect(store.shops.get(user.shopId as number)?.shippingProfiles).toHaveLength(2);
    });

    it('derives listing quantity and price from enabled offerings', () => {
        const store = new MockStore();
        const user = store.createUser({ scenario: 'empty' });
        const listing = store.addListing(user.shopId as number, {
            title: 'Ruby Ring',
            state: 'active',
            price: 30,
            variations: [
                { propertyName: 'Size', value: 'M', quantity: 2 },
                { propertyName: 'Size', value: 'L', quantity: 3 },
            ],
        });
        expect(store.listingQuantity(listing)).toBe(5);
        expect(store.listingPriceAmount(listing)).toBe(3000);
    });

    it('reset clears everything', () => {
        const store = new MockStore();
        store.createUser({ scenario: 'established' });
        store.reset();
        expect(store.users.size).toBe(0);
        expect(store.listings.size).toBe(0);
    });
});
