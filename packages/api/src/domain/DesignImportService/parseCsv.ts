import type { EtsyRow } from '@jewellery-catalogue/types';
import { parse } from 'csv-parse/sync';

const MAX_IMAGES_PER_DESIGN = 3;

export const parseCsv = (csvText: string): EtsyRow[] => {
    const records: Record<string, string>[] = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        bom: true,
    });

    return records.map((r) => {
        const imageUrls: string[] = [];
        for (let i = 1; i <= 10; i++) {
            const url = (r[`IMAGE${i}`] ?? '').trim();
            if (url) imageUrls.push(url);
        }

        const materials = (r.MATERIALS ?? '')
            .split(',')
            .map((m) => m.trim())
            .filter((m) => m.length > 0);

        const price = Number(r.PRICE);
        const quantity = Number(r.QUANTITY);

        return {
            title: (r.TITLE ?? '').trim(),
            description: r.DESCRIPTION ?? '',
            price: Number.isFinite(price) ? price : 0,
            quantity: Number.isFinite(quantity) ? quantity : 0,
            materials,
            imageUrls: imageUrls.slice(0, MAX_IMAGES_PER_DESIGN),
            sku: (r.SKU ?? '').trim(),
        };
    });
};
