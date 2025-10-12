import {
    type FormMaterial,
    FormMaterialSchemas,
    type Material,
    MaterialType,
    type UpdateMaterial,
} from '@jewellery-catalogue/types';

import { convertFormDataToMaterial } from '../../utils/material-conversion';
import type { IdGenerator } from '../IdGenerator';
import type { MaterialRepository } from '../MaterialRepository';

export class MaterialService {
    constructor(
        private readonly materialRepo: MaterialRepository,
        private readonly idGenerator: IdGenerator
    ) {}

    async getMaterialsByUserId(userId: string): Promise<Array<Material>> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        return this.materialRepo.getByUserId(userId);
    }

    async getMaterial(id: string, userId: string): Promise<Material> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const material = await this.materialRepo.getByIdAndUserId(id, userId);

        if (!material) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        return material;
    }

    async addMaterial(materialData: FormMaterial, userId: string): Promise<Material> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        // Validate and convert material
        const material = this.validateAndConvertMaterial(materialData, userId);

        await this.materialRepo.insert(material);

        return material;
    }

    async updateMaterial(id: string, updates: UpdateMaterial, userId: string): Promise<Material> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.materialRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        // Process the updates based on material type
        const processed = this.processUpdateMaterial(existing, updates);

        await this.materialRepo.update(id, processed);

        return processed;
    }

    private processUpdateMaterial(existing: Material, updates: UpdateMaterial): Material {
        // Ensure type matches
        if (updates.type && updates.type !== existing.type) {
            throw Object.assign(new Error('Cannot change material type'), { status: 400 });
        }

        let updated = { ...existing, ...updates };

        // Handle adding packs (if specified)
        if ('addPacks' in updates && updates.addPacks) {
            updated = this.addPacksToMaterial(updated, updates.addPacks);
        }

        // Recalculate per-unit price if pack info changed
        updated = this.recalculatePerUnitPrice(updated);

        // Remove addPacks from final object (it's not a stored field)
        const { addPacks, ...finalUpdated } = updated as Material & { addPacks?: number };

        return finalUpdated;
    }

    private addPacksToMaterial(material: Material, packsToAdd: number): Material {
        switch (material.type) {
            case MaterialType.WIRE: {
                const wire = material as Material & {
                    lengthPerPack: number;
                    totalLength: number;
                    pricePerPack: number;
                };
                const additionalLength = packsToAdd * wire.lengthPerPack;
                const additionalCost = packsToAdd * wire.pricePerPack;

                return {
                    ...wire,
                    totalLength: wire.totalLength + additionalLength,
                    // Store total cost for weighted average calculation
                    _totalCost: ((wire as any)._totalCost || wire.totalLength * wire.pricePerMeter) + additionalCost,
                };
            }
            case MaterialType.BEAD: {
                const bead = material as Material & {
                    quantityPerPack: number;
                    totalQuantity: number;
                    pricePerPack: number;
                };
                const additionalQuantity = packsToAdd * bead.quantityPerPack;
                const additionalCost = packsToAdd * bead.pricePerPack;

                return {
                    ...bead,
                    totalQuantity: bead.totalQuantity + additionalQuantity,
                    _totalCost: ((bead as any)._totalCost || bead.totalQuantity * bead.pricePerBead) + additionalCost,
                };
            }
            case MaterialType.CHAIN: {
                const chain = material as Material & {
                    lengthPerPack: number;
                    totalLength: number;
                    pricePerPack: number;
                };
                const additionalLength = packsToAdd * chain.lengthPerPack;
                const additionalCost = packsToAdd * chain.pricePerPack;

                return {
                    ...chain,
                    totalLength: chain.totalLength + additionalLength,
                    _totalCost:
                        ((chain as any)._totalCost ||
                            (chain.pricePerMeter ? chain.totalLength * chain.pricePerMeter : 0)) + additionalCost,
                };
            }
            case MaterialType.EAR_HOOK: {
                const earHook = material as Material & {
                    quantityPerPack: number;
                    totalQuantity: number;
                    pricePerPack: number;
                };
                const additionalQuantity = packsToAdd * earHook.quantityPerPack;
                const additionalCost = packsToAdd * earHook.pricePerPack;

                return {
                    ...earHook,
                    totalQuantity: earHook.totalQuantity + additionalQuantity,
                    _totalCost:
                        ((earHook as any)._totalCost ||
                            (earHook.pricePerPiece ? earHook.totalQuantity * earHook.pricePerPiece : 0)) +
                        additionalCost,
                };
            }
            default:
                return material;
        }
    }

    private recalculatePerUnitPrice(material: Material): Material {
        switch (material.type) {
            case MaterialType.WIRE: {
                const wire = material as Material & { totalLength: number; pricePerMeter: number };
                const totalCost = (wire as any)._totalCost || wire.totalLength * wire.pricePerMeter;
                const newPricePerMeter = wire.totalLength > 0 ? totalCost / wire.totalLength : wire.pricePerMeter;

                const { _totalCost, ...cleanWire } = wire as any;
                return { ...cleanWire, pricePerMeter: newPricePerMeter };
            }
            case MaterialType.BEAD: {
                const bead = material as Material & { totalQuantity: number; pricePerBead: number };
                const totalCost = (bead as any)._totalCost || bead.totalQuantity * bead.pricePerBead;
                const newPricePerBead = bead.totalQuantity > 0 ? totalCost / bead.totalQuantity : bead.pricePerBead;

                const { _totalCost, ...cleanBead } = bead as any;
                return { ...cleanBead, pricePerBead: newPricePerBead };
            }
            case MaterialType.CHAIN: {
                const chain = material as Material & { totalLength: number; pricePerMeter?: number };
                const totalCost =
                    (chain as any)._totalCost || (chain.pricePerMeter ? chain.totalLength * chain.pricePerMeter : 0);
                const newPricePerMeter =
                    chain.totalLength > 0 && totalCost > 0 ? totalCost / chain.totalLength : chain.pricePerMeter;

                const { _totalCost, ...cleanChain } = chain as any;
                return { ...cleanChain, pricePerMeter: newPricePerMeter };
            }
            case MaterialType.EAR_HOOK: {
                const earHook = material as Material & { totalQuantity: number; pricePerPiece?: number };
                const totalCost =
                    (earHook as any)._totalCost ||
                    (earHook.pricePerPiece ? earHook.totalQuantity * earHook.pricePerPiece : 0);
                const newPricePerPiece =
                    earHook.totalQuantity > 0 && totalCost > 0
                        ? totalCost / earHook.totalQuantity
                        : earHook.pricePerPiece;

                const { _totalCost, ...cleanEarHook } = earHook as any;
                return { ...cleanEarHook, pricePerPiece: newPricePerPiece };
            }
            default:
                return material;
        }
    }

    async deleteMaterial(id: string, userId: string): Promise<void> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const material = await this.materialRepo.getByIdAndUserId(id, userId);

        if (!material) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        await this.materialRepo.delete(id);
    }

    private validateAndConvertMaterial(materialData: FormMaterial, userId: string): Material {
        const materialType = materialData?.type;

        if (!(materialType in MaterialType)) {
            throw Object.assign(new Error(`Unknown material type: ${materialType}`), { status: 400 });
        }

        const schema = FormMaterialSchemas[materialType];

        const result = schema.safeParse(materialData);

        if (!result.success) {
            const issues = result.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            }));

            throw Object.assign(
                new Error(
                    `Validation failed for material of type '${materialType}':\n` +
                        issues.map((i) => `- ${i.path}: ${i.message}`).join('\n')
                ),
                { status: 400, issues }
            );
        }

        const material = this.convertFormDataToMaterial(result.data);

        return {
            id: this.idGenerator.generate(),
            userId: userId,
            dateAdded: new Date(),
            ...material,
        } as Material;
    }

    private convertFormDataToMaterial(formData: FormMaterial): Partial<Material> {
        return convertFormDataToMaterial(formData);
    }
}
