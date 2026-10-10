import { beforeEach, describe, expect, it, mock } from 'bun:test';

import type { DesignRepository } from '../DesignRepository';
import type { MaterialRepository } from '../MaterialRepository';
import { ProductionPlanner } from './index';

const mockDesignRepo = { getByUserId: mock() };
const mockMaterialRepo = { getByUserId: mock() };

const design = {
    id: 'ring',
    name: 'Ring',
    materials: [],
    variants: [{ id: 'v-1', optionIds: [], name: 'A', totalQuantity: 0, totalMaterialCosts: 0, price: 0 }],
};

describe('ProductionPlanner', () => {
    let planner: ProductionPlanner;

    beforeEach(() => {
        mockDesignRepo.getByUserId.mockReset().mockResolvedValue([design]);
        mockMaterialRepo.getByUserId.mockReset().mockResolvedValue([]);
        planner = new ProductionPlanner(
            mockDesignRepo as unknown as DesignRepository,
            mockMaterialRepo as unknown as MaterialRepository
        );
    });

    it("summarises every one of the user's designs", async () => {
        const result = await planner.getProducible('user-1');

        expect(mockDesignRepo.getByUserId).toHaveBeenCalledWith('user-1');
        expect(result.map((s) => s.designId)).toEqual(['ring']);
    });

    it("rejects a design that isn't the user's", async () => {
        await expect(planner.getShoppingList('user-1', [{ designId: 'other', quantity: 1 }])).rejects.toMatchObject({
            status: 404,
        });
    });

    it('rejects a variant that is not on the design', async () => {
        await expect(
            planner.getShoppingList('user-1', [{ designId: 'ring', variantId: 'v-x', quantity: 1 }])
        ).rejects.toMatchObject({ status: 404 });
    });

    it('builds a list for valid targets', async () => {
        const list = await planner.getShoppingList('user-1', [{ designId: 'ring', variantId: 'v-1', quantity: 2 }]);

        expect(list).toEqual({ lines: [], totalCost: 0 });
    });
});
