import { createHash } from 'node:crypto';
import type { Design, EtsyRow } from '@jewellery-catalogue/types';

// fallow-ignore-next-line unused-export
export const normalise = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

const sha1 = (s: string): string => createHash('sha1').update(s).digest('hex');

export const deriveImportKey = (row: EtsyRow): string => (row.sku.trim() ? row.sku.trim() : sha1(normalise(row.title)));

// fallow-ignore-next-line unused-export
export const extractEtsyImageId = (url: string): string => {
    const match = url.match(/\/(\d+)\/il_/);
    return match ? match[1] : url;
};

export const imageSignature = (urls: string[]): string => urls.map(extractEtsyImageId).join(',');

// fallow-ignore-next-line unused-export
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const diffChangedFields = (row: EtsyRow, design: Design): string[] => {
    const changed: string[] = [];
    if (normalise(row.title) !== normalise(design.name)) changed.push('name');
    if (row.description !== design.description) changed.push('description');
    if (round2(row.price) !== round2(design.price)) changed.push('price');
    if (imageSignature(row.imageUrls) !== (design.etsyImageSignature ?? '')) changed.push('images');
    return changed;
};
