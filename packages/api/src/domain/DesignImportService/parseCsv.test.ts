import { describe, expect, it } from 'bun:test';
import { parseCsv } from './parseCsv';

const CSV = `TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,IMAGE1,IMAGE2,SKU
Green Ring,"Line one
Line two",6.15,GBP,3,tag1,"Aventurine,Copper,Stone",https://i.etsystatic.com/1/il/a/111/il_x.jpg,,
Silver Ring,Simple,8.30,GBP,1,tag2,"Silver,Stone",https://i.etsystatic.com/1/il/b/222/il_y.jpg,https://i.etsystatic.com/1/il/c/333/il_z.jpg,SKU-1`;

describe('parseCsv', () => {
    it('parses rows including quoted embedded newlines', () => {
        const rows = parseCsv(CSV);
        expect(rows).toHaveLength(2);
        expect(rows[0].title).toBe('Green Ring');
        expect(rows[0].description).toBe('Line one\nLine two');
        expect(rows[0].price).toBe(6.15);
        expect(rows[0].quantity).toBe(3);
        expect(rows[0].materials).toEqual(['Aventurine', 'Copper', 'Stone']);
        expect(rows[0].imageUrls).toEqual(['https://i.etsystatic.com/1/il/a/111/il_x.jpg']);
        expect(rows[0].sku).toBe('');
    });

    it('collects multiple images and reads sku', () => {
        const rows = parseCsv(CSV);
        expect(rows[1].imageUrls).toHaveLength(2);
        expect(rows[1].sku).toBe('SKU-1');
    });
});
