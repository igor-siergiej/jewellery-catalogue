export const ETSY_MOCK_URL = process.env.E2E_ETSY_MOCK_URL ?? 'http://localhost:3010';

async function control<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${ETSY_MOCK_URL}/__mock${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Etsy mock ${method} ${path} failed: ${await res.text()}`);
    return res.json() as Promise<T>;
}

export async function findMockShop(name: string): Promise<{ shopId: number; userId: number }> {
    const shops = await control<Array<{ shopId: number; userId: number }>>(
        'GET',
        `/shops?name=${encodeURIComponent(name)}`
    );
    if (shops.length !== 1) throw new Error(`Expected one mock shop named ${name}, found ${shops.length}`);
    return shops[0];
}

type MockListingJson = {
    listing_id: number;
    title: string;
    state: string;
    price: { amount: number };
    tags: string[];
};

export async function mockShopListings(shopId: number): Promise<MockListingJson[]> {
    const state = await control<{ shops: Array<{ shopId: number; listings: MockListingJson[] }> }>('GET', '/state');
    return state.shops.find((s) => s.shopId === shopId)?.listings ?? [];
}

export const setMockListingState = (listingId: number, state: string) =>
    control('POST', `/listings/${listingId}/state`, { state });
