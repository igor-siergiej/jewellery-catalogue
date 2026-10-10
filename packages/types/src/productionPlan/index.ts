import { z } from 'zod';

export interface ProducibleVariant {
    variantId: string;
    name: string;
    canMake: number | null;
}

export interface ProducibleSummary {
    designId: string;
    // How many more can be made from current stock, limited by the scarcest material. null when
    // the design lists no materials. For designs with variants this is the best single variant.
    canMake: number | null;
    variants: ProducibleVariant[];
}

export const shoppingListRequestSchema = z.object({
    items: z
        .array(
            z.object({
                designId: z.string().min(1),
                variantId: z.string().min(1).nullable().optional(),
                quantity: z.number().int().positive(),
            })
        )
        .min(1),
});
export type ShoppingListRequest = z.infer<typeof shoppingListRequestSchema>;

export interface ShoppingListLine {
    materialId: string;
    name: string;
    brand: string;
    purchaseUrl: string;
    unit: 'm' | 'pcs';
    required: number;
    inStock: number;
    shortfall: number;
    packSize: number;
    packsToBuy: number;
    pricePerPack: number;
    estimatedCost: number;
}

export interface ShoppingList {
    // every material the targets need, sorted with shortfalls first
    lines: ShoppingListLine[];
    totalCost: number;
}
