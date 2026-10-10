import { beforeEach, describe, expect, it, mock } from 'bun:test';

import type { DesignRepository } from '../DesignRepository';
import type { VisionLlm } from '../EtsyListingCopyService/types';
import type { SaleRepository } from '../SaleRepository';
import type { UserSettingsService } from '../UserSettingsService';
import { PriceSuggestionService } from './index';
import { priceReplySchema } from './prompt';

const vision = { isConfigured: mock(() => true), completeStructured: mock() };
const designRepo = { getByUserId: mock() };
const saleRepo = { getByUserIdSoldBetween: mock() };
const settings = { get: mock() };

const design = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Design ${id}`,
    designType: 'RING',
    price: 30,
    totalMaterialCosts: 8,
    timeRequired: '01:30',
    ...overrides,
});

describe('PriceSuggestionService', () => {
    let service: PriceSuggestionService;

    beforeEach(() => {
        for (const m of [...Object.values(vision), ...Object.values(designRepo), ...Object.values(saleRepo)]) {
            m.mockClear();
        }
        vision.isConfigured.mockImplementation(() => true);
        designRepo.getByUserId.mockResolvedValue([
            design('ring'),
            design('other-ring', { price: 40 }),
            design('necklace', { designType: 'NECKLACE' }),
        ]);
        saleRepo.getByUserIdSoldBetween.mockResolvedValue([
            { designId: 'ring', quantity: 2, price: 28, soldAt: Date.UTC(2026, 9, 1) },
            { designId: 'other-ring', quantity: 5, price: 40, soldAt: Date.UTC(2026, 9, 2) },
        ]);
        settings.get.mockResolvedValue({ markupMultiplier: 2.5, hourlyRate: 10 });
        vision.completeStructured.mockResolvedValue({ low: 28, high: 38, recommended: 34, rationale: 'Sells well.' });
        service = new PriceSuggestionService(
            designRepo as unknown as DesignRepository,
            saleRepo as unknown as SaleRepository,
            settings as unknown as UserSettingsService,
            vision as unknown as VisionLlm
        );
    });

    it("sends only the user's own figures, as a text-only call, and returns the range with the formula price", async () => {
        const result = await service.suggest('ring', 'user-1');

        const call = vision.completeStructured.mock.calls[0]?.[0] as { prompt: string; imageUrls: string[] };
        expect(call.imageUrls).toEqual([]);
        expect(call.prompt).toContain('Material cost: £8.00');
        expect(call.prompt).toContain('Usual formula price (materials × markup + time × rate): £35.00');
        expect(call.prompt).toContain('2 sold at an average of £28.00');
        // same type listed first, with its own sales
        expect(call.prompt.indexOf('Design other-ring')).toBeLessThan(call.prompt.indexOf('Design necklace'));
        expect(call.prompt).toContain('- Design other-ring: priced £40.00, materials £8.00, 5 sold');
        expect(result).toEqual({
            low: 28,
            high: 38,
            recommended: 34,
            rationale: 'Sells well.',
            formulaPrice: 35,
            materialCost: 8,
        });
    });

    it('never returns a price below material cost, even if the model does', async () => {
        vision.completeStructured.mockResolvedValue({ low: 2, high: 5, recommended: 3, rationale: 'Cheap.' });

        const result = await service.suggest('ring', 'user-1');

        expect([result.low, result.high, result.recommended]).toEqual([8, 8, 8]);
    });

    it('keeps the recommendation inside the range after clamping', async () => {
        vision.completeStructured.mockResolvedValue({ low: 5, high: 20, recommended: 25, rationale: 'x' });

        const result = await service.suggest('ring', 'user-1');

        expect([result.low, result.high, result.recommended]).toEqual([8, 20, 20]);
    });

    it('404s for a design the user does not own', async () => {
        await expect(service.suggest('someone-elses', 'user-1')).rejects.toMatchObject({ status: 404 });
        expect(vision.completeStructured).not.toHaveBeenCalled();
    });

    it('returns 503 when AI is not configured', async () => {
        vision.isConfigured.mockImplementation(() => false);

        await expect(service.suggest('ring', 'user-1')).rejects.toMatchObject({ status: 503 });
    });
});

describe('priceReplySchema', () => {
    it('rejects a range whose low exceeds its high, and negative prices', () => {
        expect(priceReplySchema.safeParse({ low: 30, high: 20, recommended: 25, rationale: 'x' }).success).toBe(false);
        expect(priceReplySchema.safeParse({ low: -1, high: 20, recommended: 5, rationale: 'x' }).success).toBe(false);
    });
});
