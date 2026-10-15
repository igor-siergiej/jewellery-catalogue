import { describe, expect, it } from 'bun:test';
import { createEtsyMockApp } from '../app';
import { MockStore } from '../store';

describe('dashboard', () => {
    it('lists shops, listings and the seller actions', async () => {
        const store = new MockStore();
        store.createUser({ shopName: 'Bead Shop', scenario: 'established' });
        const res = await createEtsyMockApp({ store, publicUrl: 'http://mock' }).request('/');
        const page = await res.text();
        expect(res.status).toBe(200);
        expect(page).toContain('Bead Shop');
        expect(page).toContain('Silver Moon Pendant Necklace');
        expect(page).toContain('Sell 1');
        expect(page).toContain('Reset everything');
    });

    it('escapes listing titles', async () => {
        const store = new MockStore();
        const user = store.createUser({ scenario: 'empty' });
        store.addListing(user.shopId as number, { title: '<script>x</script>', state: 'active', price: 1 });
        const page = await (await createEtsyMockApp({ store, publicUrl: 'http://mock' }).request('/')).text();
        expect(page).not.toContain('<script>x</script>');
    });
});
