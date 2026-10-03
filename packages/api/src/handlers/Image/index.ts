import { Readable } from 'node:stream';
import { APIError } from '@imapps/api-utils/hono';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { DesignRepository } from '../../domain/DesignRepository';
import type { DraftRepository } from '../../domain/DraftRepository';
import type { IdGenerator } from '../../domain/IdGenerator';
import type { ImageService } from '../../domain/ImageService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getImageService = (): ImageService => dependencyContainer.resolve(DependencyToken.ImageService);
const getIdGenerator = (): IdGenerator => dependencyContainer.resolve(DependencyToken.IdGenerator);
const getDesignRepository = (): DesignRepository => dependencyContainer.resolve(DependencyToken.DesignRepository);
const getDraftRepository = (): DraftRepository => dependencyContainer.resolve(DependencyToken.DraftRepository);

export const uploadImage = async (c: Ctx) => {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!(file instanceof File)) {
        throw new APIError('File is required', 400);
    }

    const imageId = getIdGenerator().generate();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/octet-stream';

    await getImageService().uploadImage(imageId, fileBuffer, contentType);
    return c.json({ imageId }, 201);
};

export const getImage = async (c: Ctx) => {
    const name = c.req.param('name');
    const userId = c.get('userId');

    const [ownedByDesign, ownedByDraft] = await Promise.all([
        getDesignRepository().imageBelongsToUser(name, userId),
        getDraftRepository().imageBelongsToUser(name, userId),
    ]);

    if (!ownedByDesign && !ownedByDraft) {
        throw new APIError('Image not found', 404);
    }

    try {
        const { stream, contentType, cacheControl } = await getImageService().getImage(name);
        c.header('Content-Type', contentType);
        c.header('Cache-Control', cacheControl);
        return c.body(Readable.toWeb(stream as Readable) as unknown as ReadableStream);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status === 404) {
            throw new APIError('Image not found', 404);
        }
        throw new APIError(err.message ?? 'Internal Server Error', err.status ?? 500);
    }
};
