import { z } from 'zod';

export const PRICE_SYSTEM_PROMPT = [
    'You help a handmade jewellery maker price one of their designs for their Etsy shop.',
    "You only see the maker's own data: costs, making time, their usual pricing formula, their own sales",
    'of this design and of their comparable designs. Do not invent market or competitor data.',
    'Suggest a price range in GBP and one recommended price, with a two or three sentence rationale',
    'that refers to the numbers you were given.',
    'Reply with a single JSON object only.',
].join('\n');

export interface ComparableDesign {
    name: string;
    price: number;
    materialCost: number;
    unitsSold: number;
}

export interface PricePromptInput {
    name: string;
    designType: string | null;
    currentPrice: number;
    materialCost: number;
    hoursToMake: number;
    hourlyRate: number;
    formulaPrice: number;
    sales: { unitsSold: number; averagePrice: number | null; firstSaleAt: number | null };
    comparables: ComparableDesign[];
}

const gbp = (value: number) => `£${value.toFixed(2)}`;

export const buildPricePrompt = (input: PricePromptInput): string =>
    [
        `Design: ${input.name}${input.designType ? ` (${input.designType.toLowerCase()})` : ''}`,
        `Current price: ${gbp(input.currentPrice)}`,
        `Material cost: ${gbp(input.materialCost)}`,
        `Making time: ${input.hoursToMake.toFixed(2)} hours at ${gbp(input.hourlyRate)}/hour`,
        `Usual formula price (materials × markup + time × rate): ${gbp(input.formulaPrice)}`,
        input.sales.unitsSold > 0
            ? `Sales of this design: ${input.sales.unitsSold} sold at an average of ${gbp(input.sales.averagePrice ?? 0)}, since ${new Date(input.sales.firstSaleAt ?? 0).toISOString().slice(0, 10)}`
            : 'Sales of this design: none recorded yet',
        '',
        'Comparable designs in the same shop:',
        ...(input.comparables.length > 0
            ? input.comparables.map(
                  (c) => `- ${c.name}: priced ${gbp(c.price)}, materials ${gbp(c.materialCost)}, ${c.unitsSold} sold`
              )
            : ['(none)']),
        '',
        `Never suggest anything below the material cost of ${gbp(input.materialCost)}.`,
        'Return JSON shaped exactly like: {"low": number, "high": number, "recommended": number, "rationale": string}',
    ].join('\n');

export const priceReplySchema = z
    .object({
        low: z.number().nonnegative(),
        high: z.number().nonnegative(),
        recommended: z.number().nonnegative(),
        rationale: z.string().trim().min(1).max(600),
    })
    .refine((r) => r.low <= r.high, { message: 'low must not exceed high', path: ['low'] });
export type PriceReply = z.infer<typeof priceReplySchema>;
