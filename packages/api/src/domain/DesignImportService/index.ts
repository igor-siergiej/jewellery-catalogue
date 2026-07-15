import type {
    Design,
    EtsyRow,
    ImportCandidate,
    ImportInvalidRow,
    ImportPreviewResult,
} from '@jewellery-catalogue/types';
import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';
import type { MaterialRepository } from '../MaterialRepository';
import { deriveImportKey, diffChangedFields, imageSignature } from './deriveKeys';
import type { EtsyImageFetcher } from './imageFetcher';
import { inferDesignType } from './inferDesignType';
import { parseCsv } from './parseCsv';
import { PlaceholderMaterialResolver, placeholderNameForTag } from './placeholderMaterials';

export class DesignImportService {
    constructor(
        private readonly designRepo: DesignRepository,
        // biome-ignore lint/correctness/noUnusedPrivateClassMembers: used by commit() in Task 8
        private readonly materialRepo: MaterialRepository,
        private readonly imageService: ImageService,
        private readonly idGenerator: IdGenerator,
        private readonly imageFetcher: EtsyImageFetcher
    ) {}

    async preview(csvText: string, userId: string): Promise<ImportPreviewResult> {
        const rows = parseCsv(csvText);
        const existing = await this.designRepo.getByUserId(userId);
        const byKey = new Map<string, Design>();
        for (const d of existing) if (d.importKey) byKey.set(d.importKey, d);

        const candidates: ImportCandidate[] = [];
        const invalid: ImportInvalidRow[] = [];

        for (const row of rows) {
            if (!row.title.trim()) {
                invalid.push({ title: row.title, reason: 'Missing title' });
                continue;
            }
            const importKey = deriveImportKey(row);
            const match = byKey.get(importKey);
            const changedFields = match ? diffChangedFields(row, match) : [];
            const status = !match ? 'NEW' : changedFields.length ? 'CHANGED' : 'SAME';

            candidates.push({
                importKey,
                name: row.title.trim(),
                status,
                changedFields,
                price: row.price,
                designType: inferDesignType(row.title),
                imageUrls: row.imageUrls,
                mappedMaterials: [...new Set(row.materials.map(placeholderNameForTag))],
                row,
            });
        }

        const summary = {
            new: candidates.filter((c) => c.status === 'NEW').length,
            changed: candidates.filter((c) => c.status === 'CHANGED').length,
            same: candidates.filter((c) => c.status === 'SAME').length,
            invalid: invalid.length,
        };

        return { candidates, invalid, summary };
    }

    // commit() implemented in Task 8

    // biome-ignore lint/correctness/noUnusedPrivateClassMembers: used by commit() in Task 8
    private async uploadImages(row: EtsyRow): Promise<string[]> {
        const ids: string[] = [];
        for (const url of row.imageUrls) {
            try {
                const { buffer, contentType } = await this.imageFetcher.fetch(url);
                const id = this.idGenerator.generate();
                await this.imageService.uploadImage(id, buffer, contentType);
                ids.push(id);
            } catch {
                // skip individual image failures
            }
        }
        return ids;
    }

    // biome-ignore lint/correctness/noUnusedPrivateClassMembers: used by commit() in Task 8
    private newDesign(candidate: ImportCandidate, imageIds: string[], materials: Design['materials']): Design {
        const { row } = candidate;
        return {
            id: this.idGenerator.generate(),
            userId: '', // set by caller
            name: row.title.trim(),
            description: row.description,
            timeRequired: '0',
            materials,
            imageIds,
            price: row.price,
            totalMaterialCosts: 0,
            dateAdded: new Date(),
            totalQuantity: row.quantity,
            designType: candidate.designType,
            importSource: 'ETSY',
            importKey: candidate.importKey,
            etsyImageSignature: imageSignature(row.imageUrls),
            etsyMaterials: row.materials,
        };
    }
}

export { PlaceholderMaterialResolver };
