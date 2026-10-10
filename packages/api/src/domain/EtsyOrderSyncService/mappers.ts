import type { Design, Sale } from '@jewellery-catalogue/types';

import type { EtsyReceipt, EtsyReceiptTransaction } from '../EtsyClient';

const NOT_SOLD_STATUSES = new Set(['canceled', 'fully refunded']);

export const isCountableReceipt = (receipt: EtsyReceipt): boolean =>
    receipt.isPaid && !NOT_SOLD_STATUSES.has(receipt.status.toLowerCase());

const normalise = (value: string): string =>
    value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
        .toLowerCase();

// Variants are pushed to Etsy with the group name as the property name and the option's
// material name as the value (see EtsyPushService buildInventoryProducts), so match on those.
const findVariantId = (design: Design, transaction: EtsyReceiptTransaction): string | null => {
    const groups = design.variationGroups ?? [];
    const sold = new Map(transaction.variations.map((v) => [normalise(v.name), normalise(v.value)]));

    const variant = (design.variants ?? []).find((candidate) =>
        groups.every((group) => {
            const option = group.options.find((o) => candidate.optionIds.includes(o.id));
            return !option || sold.get(normalise(group.name)) === normalise(option.material.name);
        })
    );

    return variant?.id ?? null;
};

export const buildSale = (args: {
    userId: string;
    receipt: EtsyReceipt;
    transaction: EtsyReceiptTransaction;
    designsByListingId: Map<number, Design>;
}): Sale => {
    const { userId, receipt, transaction, designsByListingId } = args;
    const design = designsByListingId.get(transaction.listingId) ?? null;
    const hasVariants = (design?.variants?.length ?? 0) > 0;
    const variantId = design && hasVariants ? findVariantId(design, transaction) : null;
    const matched = design !== null && (!hasVariants || variantId !== null);
    const variationLabel = transaction.variations.map((v) => `${v.name}: ${v.value}`).join(', ');

    return {
        userId,
        designId: design?.id ?? null,
        variantId,
        listingId: transaction.listingId,
        receiptId: receipt.receiptId,
        transactionId: transaction.transactionId,
        title: transaction.title,
        ...(variationLabel ? { variationLabel } : {}),
        quantity: transaction.quantity,
        price: transaction.price,
        soldAt: receipt.createdAt,
        status: matched ? 'pending' : 'unmatched',
    };
};
