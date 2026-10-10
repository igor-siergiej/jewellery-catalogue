import { APIError } from '@imapps/api-utils/hono';
import type { ProducibleSummary, ShoppingList, ShoppingListRequest } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { MaterialRepository } from '../MaterialRepository';
import { buildShoppingList, summariseProducible } from './plan';

export class ProductionPlanner {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly materialRepo: MaterialRepository
    ) {}

    private async load(userId: string) {
        const [designs, materials] = await Promise.all([
            this.designRepo.getByUserId(userId),
            this.materialRepo.getByUserId(userId),
        ]);
        return {
            designsById: new Map(designs.map((d) => [d.id, d])),
            materialsById: new Map(materials.map((m) => [m.id, m])),
        };
    }

    // fallow-ignore-next-line unused-class-member
    async getProducible(userId: string): Promise<ProducibleSummary[]> {
        const { designsById, materialsById } = await this.load(userId);
        return [...designsById.values()].map((design) => summariseProducible(design, materialsById));
    }

    // fallow-ignore-next-line unused-class-member
    async getShoppingList(userId: string, items: ShoppingListRequest['items']): Promise<ShoppingList> {
        const { designsById, materialsById } = await this.load(userId);

        for (const item of items) {
            const design = designsById.get(item.designId);
            if (!design) {
                throw new APIError(`Design ${item.designId} not found`, 404);
            }
            if (item.variantId && !design.variants?.some((v) => v.id === item.variantId)) {
                throw new APIError(`Variant ${item.variantId} not found on design ${design.name}`, 404);
            }
        }

        return buildShoppingList(items, designsById, materialsById);
    }
}
