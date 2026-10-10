import { APIError } from '@imapps/api-utils/hono';
import type { Design, PriceSuggestion, Sale } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { VisionLlm } from '../EtsyListingCopyService/types';
import type { SaleRepository } from '../SaleRepository';
import { hoursFromTimeRequired } from '../SalesReportService/calculateSalesReport';
import type { UserSettingsService } from '../UserSettingsService';
import { buildPricePrompt, PRICE_SYSTEM_PROMPT, type PriceReply, priceReplySchema } from './prompt';

const MAX_COMPARABLES = 10;

const round2 = (value: number) => Math.round(value * 100) / 100;

// The model is told the floor too, but the guarantee lives here.
const clampToMaterialCost = (reply: PriceReply, materialCost: number) => {
    const low = round2(Math.max(reply.low, materialCost));
    const high = round2(Math.max(reply.high, low));
    const recommended = round2(Math.min(Math.max(reply.recommended, low), high));
    return { low, high, recommended };
};

export class PriceSuggestionService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly saleRepo: SaleRepository,
        private readonly userSettingsService: UserSettingsService,
        private readonly vision: VisionLlm
    ) {}

    // fallow-ignore-next-line unused-class-member
    async suggest(designId: string, userId: string): Promise<PriceSuggestion> {
        if (!this.vision.isConfigured()) {
            throw new APIError('AI generation is not configured', 503);
        }

        const [designs, sales, settings] = await Promise.all([
            this.designRepo.getByUserId(userId),
            this.saleRepo.getByUserIdSoldBetween(userId, null, null),
            this.userSettingsService.get(userId),
        ]);
        const design = designs.find((d) => d.id === designId);
        if (!design) {
            throw new APIError('Design not found', 404);
        }

        const hours = hoursFromTimeRequired(design.timeRequired);
        const formulaPrice = round2(
            design.totalMaterialCosts * settings.markupMultiplier + hours * settings.hourlyRate
        );
        const unitsSoldOf = (id: string) =>
            sales.filter((s) => s.designId === id).reduce((total, s) => total + s.quantity, 0);

        const reply = await this.vision.completeStructured({
            operation: 'design.priceSuggestion',
            schema: priceReplySchema,
            system: PRICE_SYSTEM_PROMPT,
            prompt: buildPricePrompt({
                name: design.name,
                designType: design.designType ?? null,
                currentPrice: design.price,
                materialCost: design.totalMaterialCosts,
                hoursToMake: hours,
                hourlyRate: settings.hourlyRate,
                formulaPrice,
                sales: this.summariseSales(sales.filter((s) => s.designId === design.id)),
                comparables: this.comparablesFor(design, designs).map((d) => ({
                    name: d.name,
                    price: d.price,
                    materialCost: d.totalMaterialCosts,
                    unitsSold: unitsSoldOf(d.id),
                })),
            }),
            imageUrls: [],
        });

        return {
            ...clampToMaterialCost(reply, design.totalMaterialCosts),
            rationale: reply.rationale,
            formulaPrice,
            materialCost: design.totalMaterialCosts,
        };
    }

    private summariseSales(sales: Sale[]) {
        const unitsSold = sales.reduce((total, s) => total + s.quantity, 0);
        const revenue = sales.reduce((total, s) => total + s.price * s.quantity, 0);
        return {
            unitsSold,
            averagePrice: unitsSold > 0 ? round2(revenue / unitsSold) : null,
            firstSaleAt: sales.length > 0 ? Math.min(...sales.map((s) => s.soldAt)) : null,
        };
    }

    // Same design type first, then anything else, so small catalogues still get context.
    private comparablesFor(design: Design, designs: Design[]): Design[] {
        const others = designs.filter((d) => d.id !== design.id);
        const sameType = others.filter((d) => design.designType && d.designType === design.designType);
        const rest = others.filter((d) => !sameType.includes(d));
        return [...sameType, ...rest].slice(0, MAX_COMPARABLES);
    }
}
