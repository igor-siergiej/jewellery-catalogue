import type { MockStore } from './store';

export type Scenario = 'established' | 'empty' | 'no-shop' | 'two-shipping-profiles';
export const SCENARIOS: Scenario[] = ['established', 'empty', 'no-shop', 'two-shipping-profiles'];

export interface TaxonomyNode {
    id: number;
    name: string;
    children: TaxonomyNode[];
}

// Illustrative ids, not Etsy's real taxonomy ids.
export const TAXONOMY: TaxonomyNode[] = [
    {
        id: 1200,
        name: 'Jewelry',
        children: [
            {
                id: 1210,
                name: 'Earrings',
                children: [
                    { id: 1211, name: 'Stud Earrings', children: [] },
                    { id: 1212, name: 'Dangle & Drop Earrings', children: [] },
                ],
            },
            { id: 1220, name: 'Necklaces', children: [{ id: 1221, name: 'Pendants', children: [] }] },
            { id: 1230, name: 'Bracelets', children: [{ id: 1231, name: 'Beaded Bracelets', children: [] }] },
            { id: 1240, name: 'Rings', children: [] },
        ],
    },
];

export const taxonomyIds = (nodes: TaxonomyNode[] = TAXONOMY): number[] =>
    nodes.flatMap((n) => [n.id, ...taxonomyIds(n.children)]);

export const seedShop = (store: MockStore, shopId: number, scenario: Scenario): void => {
    const shop = store.shops.get(shopId);
    if (!shop) return;

    shop.shippingProfiles.push({ shippingProfileId: store.id(), title: 'UK Royal Mail' });
    if (scenario === 'two-shipping-profiles') {
        shop.shippingProfiles.push({ shippingProfileId: store.id(), title: 'International' });
    }
    shop.readinessStates.push(
        { readinessStateId: store.id(), readinessState: 'ready_to_ship' },
        { readinessStateId: store.id(), readinessState: 'made_to_order' }
    );

    if (scenario !== 'established') return;

    const moon = store.addListing(shopId, {
        title: 'Silver Moon Pendant Necklace',
        description: 'Hand-wrapped sterling silver crescent on a fine chain.',
        tags: ['moon necklace', 'silver pendant'],
        state: 'active',
        price: 32,
        quantity: 4,
        taxonomyId: 1221,
    });
    store.addListing(shopId, {
        title: 'Amethyst Drop Earrings',
        state: 'active',
        price: 24,
        quantity: 3,
        taxonomyId: 1212,
    });
    store.addListing(shopId, {
        title: 'Birthstone Stacking Ring',
        state: 'active',
        price: 18,
        taxonomyId: 1240,
        variations: [
            { propertyName: 'Stone', value: 'Ruby', quantity: 2 },
            { propertyName: 'Stone', value: 'Sapphire', quantity: 1 },
        ],
    });
    store.addListing(shopId, {
        title: 'Rose Quartz Bead Bracelet',
        state: 'active',
        price: 15,
        quantity: 6,
        taxonomyId: 1231,
    });
    store.addListing(shopId, { title: 'Pearl Studs', state: 'sold_out', price: 20, quantity: 0, taxonomyId: 1211 });
    store.addListing(shopId, { title: 'Unfinished Draft Anklet', state: 'draft', price: 12, taxonomyId: 1200 });
    store.addListing(shopId, { title: 'Retired Gold Hoops', state: 'inactive', price: 40, taxonomyId: 1212 });

    store.createOrder(shopId, { listingId: moon.listingId, quantity: 1 });
};
