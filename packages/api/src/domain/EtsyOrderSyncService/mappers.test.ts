import { describe, expect, it } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';

import type { EtsyReceipt, EtsyReceiptTransaction } from '../EtsyClient';
import { buildSale, isCountableReceipt } from './mappers';

const makeTransaction = (overrides: Partial<EtsyReceiptTransaction> = {}): EtsyReceiptTransaction => ({
    transactionId: 21,
    listingId: 31,
    title: 'Silver Ring',
    quantity: 1,
    price: 25,
    variations: [],
    ...overrides,
});

const makeReceipt = (overrides: Partial<EtsyReceipt> = {}): EtsyReceipt => ({
    receiptId: 11,
    status: 'Paid',
    isPaid: true,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_500,
    transactions: [makeTransaction()],
    ...overrides,
});

const material = (name: string) => ({ id: name, name, type: 'bead' }) as never;

const makeDesign = (overrides: Partial<Design> = {}): Design => ({
    id: 'design-1',
    userId: 'user-1',
    name: 'Silver Ring',
    description: '',
    timeRequired: '01:00',
    materials: [],
    imageIds: [],
    diagramImageIds: [],
    makingNotes: '',
    price: 25,
    totalMaterialCosts: 10,
    dateAdded: new Date(),
    totalQuantity: 3,
    etsy: { listingId: 31, state: 'active', lastPushedAt: null },
    ...overrides,
});

const variantDesign = makeDesign({
    variationGroups: [
        {
            id: 'g-stone',
            name: 'Stone',
            required: 1,
            options: [
                { id: 'o-opal', material: material('Opal') },
                { id: 'o-jade', material: material('Jade & Gold') },
            ],
        },
    ],
    variants: [
        { id: 'v-opal', optionIds: ['o-opal'], name: 'Opal', totalQuantity: 2, totalMaterialCosts: 5, price: 25 },
        { id: 'v-jade', optionIds: ['o-jade'], name: 'Jade', totalQuantity: 1, totalMaterialCosts: 5, price: 25 },
    ],
});

const build = (transaction: EtsyReceiptTransaction, designs: Design[] = []) =>
    buildSale({
        userId: 'user-1',
        receipt: makeReceipt({ transactions: [transaction] }),
        transaction,
        designsByListingId: new Map(designs.map((d) => [d.etsy?.listingId ?? 0, d])),
    });

describe('isCountableReceipt', () => {
    it('counts paid and partially refunded receipts', () => {
        expect(isCountableReceipt(makeReceipt({ status: 'Paid' }))).toBe(true);
        expect(isCountableReceipt(makeReceipt({ status: 'Completed' }))).toBe(true);
        expect(isCountableReceipt(makeReceipt({ status: 'Partially Refunded' }))).toBe(true);
    });

    it('ignores unpaid, canceled and fully refunded receipts', () => {
        expect(isCountableReceipt(makeReceipt({ isPaid: false, status: 'Open' }))).toBe(false);
        expect(isCountableReceipt(makeReceipt({ status: 'Canceled' }))).toBe(false);
        expect(isCountableReceipt(makeReceipt({ status: 'Fully Refunded' }))).toBe(false);
    });
});

describe('buildSale', () => {
    it('marks a sale for a listing with no linked design as unmatched', () => {
        const sale = build(makeTransaction());

        expect(sale).toMatchObject({ designId: null, variantId: null, status: 'unmatched', transactionId: 21 });
    });

    it('matches a simple design by listing id and leaves it pending', () => {
        const sale = build(makeTransaction({ quantity: 2 }), [makeDesign()]);

        expect(sale).toMatchObject({
            userId: 'user-1',
            designId: 'design-1',
            variantId: null,
            listingId: 31,
            receiptId: 11,
            quantity: 2,
            price: 25,
            soldAt: 1_700_000_000_000,
            status: 'pending',
        });
        expect(sale.variationLabel).toBeUndefined();
    });

    it('matches a variant by property name and option material name, ignoring case', () => {
        const sale = build(makeTransaction({ variations: [{ name: 'stone', value: 'OPAL' }] }), [variantDesign]);

        expect(sale).toMatchObject({ designId: 'design-1', variantId: 'v-opal', status: 'pending' });
        expect(sale.variationLabel).toBe('stone: OPAL');
    });

    it('decodes HTML entities Etsy puts in variation values', () => {
        const sale = build(makeTransaction({ variations: [{ name: 'Stone', value: 'Jade &amp; Gold' }] }), [
            variantDesign,
        ]);

        expect(sale.variantId).toBe('v-jade');
    });

    it('keeps the design but marks the sale unmatched when no variant fits', () => {
        const sale = build(makeTransaction({ variations: [{ name: 'Stone', value: 'Ruby' }] }), [variantDesign]);

        expect(sale).toMatchObject({ designId: 'design-1', variantId: null, status: 'unmatched' });
    });
});
