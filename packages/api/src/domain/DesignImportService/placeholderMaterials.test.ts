import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { MaterialType } from '@jewellery-catalogue/types';
import type { IdGenerator } from '../IdGenerator';
import type { MaterialRepository } from '../MaterialRepository';
import { PlaceholderMaterialResolver, placeholderNameForTag } from './placeholderMaterials';

const materialRepo = {
    getByUserId: mock(),
    insert: mock(),
    getById: mock(),
    getByIdAndUserId: mock(),
    getAll: mock(),
    update: mock(),
    delete: mock(),
};
let idCounter = 0;
const idGenerator = { generate: mock(() => `id-${++idCounter}`) };

describe('placeholderMaterials', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        idCounter = 0;
    });

    it('names metals as generic wire by metal type, non-metals as generic bead', () => {
        expect(placeholderNameForTag('Copper')).toBe('Generic Copper Wire');
        expect(placeholderNameForTag('Yellow gold')).toBe('Generic Gold Wire');
        expect(placeholderNameForTag('Gold')).toBe('Generic Gold Wire');
        expect(placeholderNameForTag('Amethyst')).toBe('Generic Amethyst Bead');
        expect(placeholderNameForTag('Stainless steel')).toBe('Generic Stainless Steel Bead');
    });

    it('creates missing placeholders once and reuses existing', async () => {
        materialRepo.getByUserId.mockResolvedValue([]);
        const resolver = new PlaceholderMaterialResolver(
            materialRepo as unknown as MaterialRepository,
            idGenerator as unknown as IdGenerator
        );
        const required = await resolver.resolve(['Copper', 'Copper', 'Amethyst'], 'u1');
        expect(required).toHaveLength(2); // deduped
        expect(materialRepo.insert).toHaveBeenCalledTimes(2);
        const wire = required.find((r) => r.type === MaterialType.WIRE) as any;
        expect(wire.name).toBe('Generic Copper Wire');
        expect(wire.requiredLength).toBe(0);
        expect(wire.pricePerMeter).toBe(0);
        const bead = required.find((r) => r.type === MaterialType.BEAD) as any;
        expect(bead.requiredQuantity).toBe(0);
    });

    it('reuses a placeholder already in the repo without inserting', async () => {
        materialRepo.getByUserId.mockResolvedValue([
            {
                id: 'existing',
                userId: 'u1',
                name: 'Generic Copper Wire',
                type: MaterialType.WIRE,
                requiredLength: undefined,
            } as any,
        ]);
        const resolver = new PlaceholderMaterialResolver(
            materialRepo as unknown as MaterialRepository,
            idGenerator as unknown as IdGenerator
        );
        const required = await resolver.resolve(['Copper'], 'u1');
        expect(materialRepo.insert).not.toHaveBeenCalled();
        expect(required[0].id).toBe('existing');
        expect((required[0] as any).requiredLength).toBe(0);
    });
});
