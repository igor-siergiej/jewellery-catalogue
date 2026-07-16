import type {
    Design,
    EtsyRow,
    ImportCandidate,
    ImportCommitRequest,
    ImportCommitResult,
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
        private readonly materialRepo: MaterialRepository,
        private readonly imageService: ImageService,
        private readonly idGenerator: IdGenerator,
        private readonly imageFetcher: EtsyImageFetcher
    ) {}

    // fallow-ignore-next-line unused-class-member
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

    // fallow-ignore-next-line unused-class-member
    async commit(request: ImportCommitRequest, userId: string): Promise<ImportCommitResult> {
        const existing = await this.designRepo.getByUserId(userId);
        const byKey = new Map<string, Design>();
        for (const d of existing) if (d.importKey) byKey.set(d.importKey, d);

        const resolver = new PlaceholderMaterialResolver(this.materialRepo, this.idGenerator);
        const result: ImportCommitResult = { created: 0, updated: 0, failed: [] };

        for (const candidate of request.candidates) {
            const key = deriveImportKey(candidate.row);
            const match = byKey.get(key);
            const name = candidate.row.title.trim();

            if (!match) {
                const imageIds = await this.uploadImages(candidate.row);
                if (imageIds.length === 0) {
                    result.failed.push({ name, reason: 'No images could be fetched' });
                    continue;
                }
                const materials = await resolver.resolve(candidate.row.materials, userId);
                const design = { ...this.newDesign(candidate, imageIds, materials), userId };
                await this.designRepo.insert(design);
                result.created += 1;
                continue;
            }

            const changedFields = diffChangedFields(candidate.row, match);
            if (changedFields.length === 0) continue; // resolved SAME

            let imageIds = match.imageIds;
            let etsyImageSignature = match.etsyImageSignature;
            if (changedFields.includes('images')) {
                const fetched = await this.uploadImages(candidate.row);
                if (fetched.length > 0) {
                    imageIds = fetched;
                    etsyImageSignature = imageSignature(candidate.row.imageUrls);
                }
            }

            const updated: Design = {
                ...match,
                name,
                description: candidate.row.description,
                price: candidate.row.price,
                imageIds,
                etsyImageSignature,
            };
            await this.designRepo.update(match.id, updated);
            result.updated += 1;
        }

        return result;
    }

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
            designType: inferDesignType(row.title),
            importSource: 'ETSY',
            importKey: deriveImportKey(row),
            // If some image fetches failed, imageUrls-derived signature stays "unchanged" on
            // re-import, so a subsequent import won't retry the missing images (v1 trade-off).
            etsyImageSignature: imageSignature(row.imageUrls),
            etsyMaterials: row.materials,
        };
    }
}
