import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Readable } from 'node:stream';
import { DesignType, MaterialType } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { DraftRepository } from '../DraftRepository';
import type { VisionLlm } from '../EtsyListingCopyService/types';
import type { ImageService } from '../ImageService';
import type { ImageResizer } from '../ImageService/types';
import type { MaterialRepository } from '../MaterialRepository';
import { DesignSuggestionService } from './index';
import { designSuggestionReplySchema } from './prompt';

const vision = { isConfigured: mock(() => true), completeStructured: mock() };
const resizer = { toWebp: mock(async () => Buffer.from('small')) };
const materialRepo = { getByUserId: mock() };
const imageService = { getImage: mock() };
const designRepo = { imageBelongsToUser: mock(async () => false) };
const draftRepo = { imageBelongsToUser: mock(async () => false) };
const logger = { info: mock(), warn: mock(), error: mock(), debug: mock() };

const inventory = [
    {
        id: 'bead-opal',
        type: MaterialType.BEAD,
        name: 'Opal',
        colour: 'white',
        diameter: 4,
        materialCode: 'OP4',
    },
    {
        id: 'wire-silver',
        type: MaterialType.WIRE,
        name: 'Silver wire',
        metalType: 'SILVER',
        wireType: 'FULL',
        diameter: 0.5,
    },
];

const photo = { buffer: Buffer.from('jpeg-bytes'), contentType: 'image/jpeg' };

describe('DesignSuggestionService', () => {
    let service: DesignSuggestionService;

    beforeEach(() => {
        for (const m of [
            ...Object.values(vision),
            ...Object.values(resizer),
            ...Object.values(materialRepo),
            ...Object.values(imageService),
            ...Object.values(designRepo),
            ...Object.values(draftRepo),
            ...Object.values(logger),
        ]) {
            m.mockClear();
        }
        vision.isConfigured.mockImplementation(() => true);
        resizer.toWebp.mockImplementation(async () => Buffer.from('small'));
        designRepo.imageBelongsToUser.mockImplementation(async () => false);
        draftRepo.imageBelongsToUser.mockImplementation(async () => false);
        materialRepo.getByUserId.mockResolvedValue(inventory);
        vision.completeStructured.mockResolvedValue({
            name: 'Opal Drop Earrings',
            designType: DesignType.EARRINGS,
            materials: [
                { materialId: 'bead-opal', quantity: 2, confidence: 0.9 },
                { materialId: 'wire-silver', quantity: 12, confidence: 0.6 },
            ],
            notInStock: [{ description: 'gold ear hooks' }],
        });

        service = new DesignSuggestionService(
            vision as unknown as VisionLlm,
            resizer as unknown as ImageResizer,
            materialRepo as unknown as MaterialRepository,
            imageService as unknown as ImageService,
            designRepo as unknown as DesignRepository,
            draftRepo as unknown as DraftRepository,
            logger as never
        );
    });

    it('sends downscaled photos and the inventory, and returns the suggestion', async () => {
        const result = await service.suggest('user-1', { photos: [photo], imageIds: [] });

        expect(resizer.toWebp).toHaveBeenCalledWith(photo.buffer, 1024);
        const call = vision.completeStructured.mock.calls[0]?.[0] as {
            imageUrls: string[];
            prompt: string;
            schema: unknown;
        };
        expect(call.imageUrls).toEqual([`data:image/webp;base64,${Buffer.from('small').toString('base64')}`]);
        expect(call.prompt).toContain('id bead-opal: bead "Opal", colour white, 4mm, code OP4 (quantity = pieces)');
        expect(call.prompt).toContain('id wire-silver: wire "Silver wire"');
        expect(call.schema).toBe(designSuggestionReplySchema);
        expect(result).toEqual({
            name: 'Opal Drop Earrings',
            designType: DesignType.EARRINGS,
            materials: [
                { materialId: 'bead-opal', quantity: 2, confidence: 0.9 },
                { materialId: 'wire-silver', quantity: 12, confidence: 0.6 },
            ],
            notInStock: [{ description: 'gold ear hooks' }],
        });
    });

    it('drops material ids that are not in the inventory instead of passing them on', async () => {
        vision.completeStructured.mockResolvedValue({
            name: 'Ring',
            designType: null,
            materials: [
                { materialId: 'bead-opal', quantity: 1, confidence: 0.8 },
                { materialId: 'made-up-id', quantity: 3, confidence: 0.9 },
            ],
            notInStock: [],
        });

        const result = await service.suggest('user-1', { photos: [photo], imageIds: [] });

        expect(result.materials.map((m) => m.materialId)).toEqual(['bead-opal']);
        expect(logger.warn).toHaveBeenCalled();
    });

    it('merges a material the model listed twice', async () => {
        vision.completeStructured.mockResolvedValue({
            name: 'Ring',
            designType: null,
            materials: [
                { materialId: 'bead-opal', quantity: 1, confidence: 0.4 },
                { materialId: 'bead-opal', quantity: 2, confidence: 0.7 },
            ],
            notInStock: [],
        });

        const result = await service.suggest('user-1', { photos: [photo], imageIds: [] });

        expect(result.materials).toEqual([{ materialId: 'bead-opal', quantity: 3, confidence: 0.7 }]);
    });

    it('returns 503 without calling the model when AI is not configured', async () => {
        vision.isConfigured.mockImplementation(() => false);

        await expect(service.suggest('user-1', { photos: [photo], imageIds: [] })).rejects.toMatchObject({
            status: 503,
        });
        expect(vision.completeStructured).not.toHaveBeenCalled();
    });

    it('requires at least one photo', async () => {
        await expect(service.suggest('user-1', { photos: [], imageIds: [] })).rejects.toMatchObject({ status: 400 });
    });

    it("refuses an uploaded image id the user doesn't own", async () => {
        await expect(service.suggest('user-1', { photos: [], imageIds: ['someone-elses'] })).rejects.toMatchObject({
            status: 404,
        });
        expect(imageService.getImage).not.toHaveBeenCalled();
    });

    it('loads an already-uploaded image the user owns through a draft', async () => {
        draftRepo.imageBelongsToUser.mockImplementation(async () => true);
        imageService.getImage.mockResolvedValue({
            stream: Readable.from(Buffer.from('draft')),
            contentType: 'image/png',
        });

        await service.suggest('user-1', { photos: [], imageIds: ['draft-img'] });

        expect(resizer.toWebp).toHaveBeenCalledWith(Buffer.from('draft'), 1024);
    });

    it('rejects a photo that is not an image', async () => {
        resizer.toWebp.mockImplementation(async () => {
            throw new Error('unsupported');
        });

        await expect(service.suggest('user-1', { photos: [photo], imageIds: [] })).rejects.toMatchObject({
            status: 400,
        });
        expect(vision.completeStructured).not.toHaveBeenCalled();
    });

    it('propagates invalid model output as an error, so the client leaves its form alone', async () => {
        vision.completeStructured.mockRejectedValue(
            Object.assign(new Error('AI output failed validation'), { status: 502 })
        );

        await expect(service.suggest('user-1', { photos: [photo], imageIds: [] })).rejects.toMatchObject({
            status: 502,
        });
    });
});

describe('designSuggestionReplySchema', () => {
    it('rejects an unknown design type and an out-of-range confidence', () => {
        const result = designSuggestionReplySchema.safeParse({
            name: 'x',
            designType: 'BROOCH',
            materials: [{ materialId: 'a', quantity: 1, confidence: 2 }],
            notInStock: [],
        });

        expect(result.success).toBe(false);
    });
});
