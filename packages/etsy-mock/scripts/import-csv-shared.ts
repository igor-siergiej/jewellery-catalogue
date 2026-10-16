// fallow-ignore-file unused-file
// fallow-ignore-file unused-export
// Shared bootstrap for the import-* CLI scripts: parses flags, looks up
// the shop on the running mock, and returns the resolved shopId. Each
// script then POSTs the CSV to its respective /__mock/import-* route.

export interface ResolvedShop {
    mockUrl: string;
    shopId: number;
}

export type ArgvFlagReader = (name: string) => string | undefined;

export const readFlag =
    (argv: string[]): ArgvFlagReader =>
    (name) => {
        const hit = argv.find((a) => a.startsWith(`--${name}=`));
        return hit ? hit.slice(name.length + 3) : undefined;
    };

const resolveMock = (flag: ArgvFlagReader): string =>
    flag('mock-url') ?? process.env.ETSY_MOCK_URL ?? 'http://localhost:3010';

const numberFlag = (flag: ArgvFlagReader, name: string): number | undefined => {
    const raw = flag(name);
    if (raw === undefined) return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const resolveShop = async (argv: string[]): Promise<ResolvedShop> => {
    const flag = readFlag(argv);
    const mockUrl = resolveMock(flag);

    let shopId = numberFlag(flag, 'shop-id') ?? numberFlag(flag, 'shopId');
    if (!shopId) {
        const shopName = flag('shop-name') ?? process.env.SHOP_NAME;
        if (shopName) {
            const lookup = await fetch(`${mockUrl}/__mock/shops?name=${encodeURIComponent(shopName)}`);
            if (!lookup.ok) {
                throw new Error(`failed to look up shop "${shopName}": ${lookup.status} ${await lookup.text()}`);
            }
            const shops = (await lookup.json()) as Array<{ shopId: number }>;
            if (shops.length !== 1) {
                throw new Error(`expected 1 shop named "${shopName}", found ${shops.length}`);
            }
            shopId = shops[0]?.shopId;
        }
    }
    if (!shopId) {
        const state = await fetch(`${mockUrl}/__mock/state`);
        if (!state.ok) {
            throw new Error(`failed to read /__mock/state: ${state.status} ${await state.text()}`);
        }
        const data = (await state.json()) as { shops: { shopId: number; shopName: string }[] };
        if (data.shops.length === 1) shopId = data.shops[0]?.shopId;
    }
    if (!shopId) {
        throw new Error(
            'could not determine shopId; pass --shop-id=N, --shop-name=..., or set ETSY_MOCK_URL to a mock with exactly one shop'
        );
    }
    return { mockUrl, shopId };
};

export const buildParams = (shopId: number, extra: Record<string, string> = {}): URLSearchParams => {
    const params = new URLSearchParams();
    params.set('shopId', String(shopId));
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params;
};

export const postCsv = async (
    mockUrl: string,
    route: string,
    csv: string,
    extraParams: URLSearchParams
): Promise<{ imported: number; skipped: number }> => {
    const url = `${mockUrl}/__mock/${route}?${extraParams.toString()}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`import failed (${res.status}): ${text}`);
    return JSON.parse(text) as { imported: number; skipped: number };
};

export const printSummary = (
    route: 'listings' | 'receipts',
    shopId: number,
    summary: { imported: number; skipped: number }
) => {
    console.log(`shop ${shopId}: ${route} imported=${summary.imported} skipped=${summary.skipped}`);
};
