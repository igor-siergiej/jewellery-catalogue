import type { Material, MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';

import { MATERIAL_TYPE_LABELS, METAL_TYPE_LABELS, WIRE_TYPE_LABELS } from './materialLabels';

export type MaterialColumnKey =
    | 'name'
    | 'code'
    | 'brand'
    | 'type'
    | 'stock'
    | 'perPack'
    | 'pricePerPack'
    | 'unitPrice'
    | 'diameter'
    | 'colour'
    | 'wireType'
    | 'metalType'
    | 'length';

export type MaterialTab = MaterialType | 'all';

const ALL: MaterialColumnKey[] = ['name', 'type', 'brand', 'stock', 'pricePerPack', 'unitPrice'];

const COLUMNS_BY_TYPE: Record<MaterialType, MaterialColumnKey[]> = {
    BEAD: ['name', 'code', 'brand', 'colour', 'diameter', 'stock', 'perPack', 'pricePerPack', 'unitPrice'],
    WIRE: ['name', 'brand', 'wireType', 'metalType', 'diameter', 'stock', 'perPack', 'pricePerPack', 'unitPrice'],
    CHAIN: ['name', 'brand', 'metalType', 'length', 'stock', 'pricePerPack', 'unitPrice'],
    EAR_HOOK: ['name', 'brand', 'metalType', 'stock', 'perPack', 'pricePerPack', 'unitPrice'],
};

export function columnsFor(tab: MaterialTab): MaterialColumnKey[] {
    return tab === 'all' ? ALL : COLUMNS_BY_TYPE[tab];
}

export const COLUMN_LABELS: Record<MaterialColumnKey, string> = {
    name: 'Name',
    code: 'Code',
    brand: 'Brand',
    type: 'Type',
    stock: 'In stock',
    perPack: 'Per pack',
    pricePerPack: 'Price per pack',
    unitPrice: 'Unit price',
    diameter: 'Diameter',
    colour: 'Colour',
    wireType: 'Wire type',
    metalType: 'Metal type',
    length: 'Length per pack',
};

export const NUMERIC_COLUMNS: ReadonlySet<MaterialColumnKey> = new Set([
    'stock',
    'perPack',
    'pricePerPack',
    'unitPrice',
    'diameter',
    'length',
]);

const NONE = '–';

const price = (value: number | null | undefined) => (value == null ? NONE : `£${Number(value).toFixed(2)}`);

type MaterialFields = Partial<
    Record<
        | 'totalLength'
        | 'totalQuantity'
        | 'lengthPerPack'
        | 'quantityPerPack'
        | 'pricePerPack'
        | 'pricePerMeter'
        | 'pricePerBead'
        | 'pricePerPiece'
        | 'diameter',
        number
    > &
        Record<'colour' | 'wireType' | 'metalType', string>
>;

const fields = (material: Material) => material as Material & MaterialFields;

const stockValue = (m: MaterialFields) => m.totalLength ?? m.totalQuantity;

const unitPriceValue = (m: MaterialFields) => m.pricePerMeter ?? m.pricePerBead ?? m.pricePerPiece;

const unitPriceText = (m: MaterialFields) => {
    if (m.pricePerMeter != null) return `${price(m.pricePerMeter)}/m`;

    if (m.pricePerBead != null) return `${price(m.pricePerBead)}/bead`;

    if (m.pricePerPiece != null) return `${price(m.pricePerPiece)}/piece`;

    return NONE;
};

/** Value used to order rows by a column: enum columns sort by the label the user sees. */
export function sortValue(material: Material, key: MaterialColumnKey): string | number | undefined {
    const m = fields(material);

    switch (key) {
        case 'name':
            return material.name;
        case 'code':
            return material.materialCode;
        case 'brand':
            return material.brand;
        case 'type':
            return MATERIAL_TYPE_LABELS[material.type];
        case 'stock':
            return stockValue(m);
        case 'perPack':
            return m.lengthPerPack ?? m.quantityPerPack;
        case 'pricePerPack':
            return m.pricePerPack;
        case 'unitPrice':
            return unitPriceValue(m);
        case 'diameter':
            return m.diameter;
        case 'colour':
            return m.colour;
        case 'wireType':
            return m.wireType ? WIRE_TYPE_LABELS[m.wireType as WIRE_TYPE] : undefined;
        case 'metalType':
            return m.metalType ? METAL_TYPE_LABELS[m.metalType as METAL_TYPE] : undefined;
        case 'length':
            return m.lengthPerPack;
    }
}

/** Total stock as the user counts it: metres for wire and chain, pieces for beads and ear hooks. */
function formatStock(m: MaterialFields) {
    if (m.totalLength != null) return `${m.totalLength.toFixed(2)}m`;

    if (m.totalQuantity != null) return String(Math.round(m.totalQuantity));

    return NONE;
}

const perPack = (m: MaterialFields) =>
    m.lengthPerPack != null
        ? `${m.lengthPerPack.toFixed(2)}m`
        : m.quantityPerPack != null
          ? String(Math.round(m.quantityPerPack))
          : NONE;

/** The text a column shows for a material. */
export function cellText(material: Material, key: MaterialColumnKey): string {
    const m = fields(material);

    switch (key) {
        case 'name':
            return material.name;
        case 'code':
            return material.materialCode || NONE;
        case 'brand':
            return material.brand;
        case 'type':
            return MATERIAL_TYPE_LABELS[material.type];
        case 'stock':
            return formatStock(m);
        case 'perPack':
            return perPack(m);
        case 'pricePerPack':
            return price(m.pricePerPack);
        case 'unitPrice':
            return unitPriceText(m);
        case 'diameter':
            return m.diameter ? `${m.diameter.toFixed(2)}mm` : NONE;
        case 'colour':
            return m.colour || NONE;
        case 'wireType':
            return m.wireType ? WIRE_TYPE_LABELS[m.wireType as WIRE_TYPE] : NONE;
        case 'metalType':
            return m.metalType ? METAL_TYPE_LABELS[m.metalType as METAL_TYPE] : NONE;
        case 'length':
            return m.lengthPerPack != null ? `${m.lengthPerPack.toFixed(2)}m` : NONE;
    }
}
