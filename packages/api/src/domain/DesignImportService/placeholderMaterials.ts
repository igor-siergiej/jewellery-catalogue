import { type Material, MaterialType, METAL_TYPE, type RequiredMaterial, WIRE_TYPE } from '@jewellery-catalogue/types';
import type { IdGenerator } from '../IdGenerator';
import type { MaterialRepository } from '../MaterialRepository';

const SENTINEL_STOCK = 1_000_000;

const METAL_TAG_TO_TYPE: Record<string, METAL_TYPE> = {
    copper: METAL_TYPE.COPPER,
    silver: METAL_TYPE.SILVER,
    brass: METAL_TYPE.BRASS,
    gold: METAL_TYPE.GOLD,
    'yellow gold': METAL_TYPE.GOLD,
    gilt: METAL_TYPE.GILT,
};

const titleCase = (s: string): string =>
    s
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

const metalTypeForTag = (tag: string): METAL_TYPE | undefined => METAL_TAG_TO_TYPE[tag.trim().toLowerCase()];

export const placeholderNameForTag = (tag: string): string => {
    const metal = metalTypeForTag(tag);
    if (metal) return `Generic ${titleCase(metal.toLowerCase())} Wire`;
    return `Generic ${titleCase(tag)} Bead`;
};

const buildPlaceholderMaterial = (tag: string, id: string, userId: string): Material => {
    const name = placeholderNameForTag(tag);
    const metal = metalTypeForTag(tag);
    const base = { id, userId, name, brand: 'Generic', purchaseUrl: '', dateAdded: new Date() as unknown as string };

    if (metal) {
        return {
            ...base,
            type: MaterialType.WIRE,
            metalType: metal,
            wireType: WIRE_TYPE.FULL,
            diameter: 1,
            lengthPerPack: 1,
            pricePerPack: 0,
            totalLength: SENTINEL_STOCK,
            pricePerMeter: 0,
        } as unknown as Material;
    }
    return {
        ...base,
        type: MaterialType.BEAD,
        diameter: 1,
        colour: '',
        quantityPerPack: 1,
        pricePerPack: 0,
        totalQuantity: SENTINEL_STOCK,
        pricePerBead: 0,
    } as unknown as Material;
};

const toRequired = (material: Material): RequiredMaterial =>
    material.type === MaterialType.WIRE
        ? ({ ...material, requiredLength: 0 } as RequiredMaterial)
        : ({ ...material, requiredQuantity: 0 } as RequiredMaterial);

export class PlaceholderMaterialResolver {
    constructor(
        private readonly materialRepo: MaterialRepository,
        private readonly idGenerator: IdGenerator
    ) {}

    async resolve(tags: string[], userId: string): Promise<RequiredMaterial[]> {
        const existing = await this.materialRepo.getByUserId(userId);
        const byName = new Map<string, Material>();
        for (const m of existing) byName.set(m.name, m);

        const uniqueNames = new Map<string, string>(); // name -> originating tag
        for (const tag of tags) {
            const name = placeholderNameForTag(tag);
            if (!uniqueNames.has(name)) uniqueNames.set(name, tag);
        }

        const result: RequiredMaterial[] = [];
        for (const [name, tag] of uniqueNames) {
            let material = byName.get(name);
            if (!material) {
                material = buildPlaceholderMaterial(tag, this.idGenerator.generate(), userId);
                await this.materialRepo.insert(material);
                byName.set(name, material);
            }
            result.push(toRequired(material));
        }
        return result;
    }
}
