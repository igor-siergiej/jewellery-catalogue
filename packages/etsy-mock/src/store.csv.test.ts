import { describe, expect, it } from 'bun:test';
import { MockStore } from './store';

const HEADER = 'TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,VARIATION 1 TYPE,VARIATION 1 VALUES';

const LISTINGS_CSV = [
    HEADER,
    '"Hoop Earrings","Sterling silver hoops",24.5,GBP,2,"silver|hoop",Silver,,',
    '"Wide Ring",,18,GBP,5,,Brass,"Ring Size","L|M|S",',
    ',Missing title skip me,5,GBP,1,,,,',
    '"Bad price",,not-a-number,GBP,1,,,,',
    ',,10,GBP,1,,,,', // empty title
].join('\n');

describe('MockStore.importListingsFromCsv', () => {
    it('imports rows, returns a summary, and creates draft state by default', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        const shopId = user.shopId as number;
        const result = store.importListingsFromCsv(LISTINGS_CSV, { shopId });
        expect(result.imported).toBe(2);
        expect(result.skipped).toBe(3); // empty title (×2), bad price
        const titles = [...store.listings.values()].map((l) => l.title);
        expect(titles).toEqual(['Hoop Earrings', 'Wide Ring']);
    });

    it('honours defaultState and defaultTaxonomyId', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        const result = store.importListingsFromCsv(LISTINGS_CSV, {
            shopId: user.shopId as number,
            defaultState: 'draft',
            defaultTaxonomyId: 1211,
        });
        expect(result.imported).toBe(2);
        for (const l of store.listings.values()) expect(l.state).toBe('draft');
        for (const l of store.listings.values()) expect(l.taxonomyId).toBe(1211);
    });

    it('parses comma- and pipe-separated tags and respects the 13/20 caps', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        store.importListingsFromCsv(
            ['TITLE,PRICE,QUANTITY,TAGS', '"X",1,1,"a,b,c|d|e|f|g|h|i|j|k|l|m|n|o|p|q"'].join('\n'),
            { shopId: user.shopId as number }
        );
        const l = [...store.listings.values()][0];
        if (!l) throw new Error('expected listing');
        expect(l.tags.length).toBe(13);
        for (const t of l.tags) expect(t.length).toBeLessThanOrEqual(20);
    });

    it('expands VARIATION 1 VALUES into one offering per value', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        store.importListingsFromCsv(
            ['TITLE,PRICE,QUANTITY,VARIATION 1 TYPE,VARIATION 1 VALUES', '"R","10",2,"Size","S|M|L"'].join('\n'),
            { shopId: user.shopId as number }
        );
        const l = [...store.listings.values()][0];
        if (!l) throw new Error('expected listing');
        expect(l.products).toHaveLength(3);
        expect(l.products.map((p) => p.propertyValues[0]?.values[0])).toEqual(['S', 'M', 'L']);
    });

    it('clamps quantity to 1-999', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        store.importListingsFromCsv(['TITLE,PRICE,QUANTITY', '"A",1,0', '"B",1,99999', '"C",1,-5'].join('\n'), {
            shopId: user.shopId as number,
        });
        const qtys = [...store.listings.values()].map((l) =>
            l.products.flatMap((p) => p.offerings).reduce((sum, o) => sum + o.quantity, 0)
        );
        expect(qtys).toEqual([1, 999, 1]);
    });
});

describe('MockStore.importReceiptsFromCsv', () => {
    it('imports rows, returns a summary, and stores one transaction per row', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        const result = store.importReceiptsFromCsv(
            [
                '"Sale Date","Order ID","Number of Items","Order Value","Order Net","Status","Date Shipped"',
                '10/14/26,4203423026,1,9.55,9.55,paid,10/15/26',
                '10/12/26,4203423025,2,18.00,17.50,shipped,',
                '10/12/26,,1,5,5,paid,', // empty Order ID → skip
            ].join('\n'),
            { shopId: user.shopId as number }
        );
        expect(result.imported).toBe(2);
        expect(result.skipped).toBe(1);
        expect(store.receipts.size).toBe(2);
        for (const r of store.receipts.values()) {
            expect(r.transactions).toHaveLength(1);
        }
    });

    it('parses m/d/yy dates and uses Order Net in pence when present', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        store.importReceiptsFromCsv(
            [
                '"Sale Date","Order ID","Number of Items","Order Value","Order Net","Status"',
                '1/2/26,1,3,10.00,9.50,paid',
            ].join('\n'),
            { shopId: user.shopId as number }
        );
        const r = [...store.receipts.values()][0];
        if (!r) throw new Error('expected receipt');
        // 1/2/26 → 2006-01-02 in local time → some epoch second
        expect(r.createdAt).toBeGreaterThan(0);
        expect(r.transactions[0]?.amount).toBe(950); // 9.50 * 100
    });

    it('falls back to Order Value when Order Net is missing, and skips paid=false statuses', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        store.importReceiptsFromCsv(
            [
                '"Sale Date","Order ID","Number of Items","Order Value","Order Net","Status"',
                '1/2/26,1,1,7.00,,paid',
                '1/2/26,2,1,7.00,5.00,cancelled',
            ].join('\n'),
            { shopId: user.shopId as number }
        );
        const r1 = store.receipts.get(1);
        const r2 = store.receipts.get(2);
        expect(r1?.transactions[0]?.amount).toBe(700);
        expect(r1?.isPaid).toBe(true);
        expect(r2?.isPaid).toBe(false);
    });

    it('skips duplicate receipt ids', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Test', scenario: 'empty' });
        const csv = [
            '"Sale Date","Order ID","Number of Items","Order Value","Order Net","Status"',
            '1/2/26,42,1,1,1,paid',
        ].join('\n');
        expect(store.importReceiptsFromCsv(csv, { shopId: user.shopId as number }).imported).toBe(1);
        expect(store.importReceiptsFromCsv(csv, { shopId: user.shopId as number }).imported).toBe(0);
        expect(store.importReceiptsFromCsv(csv, { shopId: user.shopId as number }).skipped).toBe(1);
    });
});
