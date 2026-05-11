import fs from 'node:fs';
import type { PersistentFile } from '@jewellery-catalogue/types';
import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { IdGenerator } from '../../domain/IdGenerator';
import type { ImageService } from '../../domain/ImageService';

const getImageService = (): ImageService => dependencyContainer.resolve(DependencyToken.ImageService);
const getIdGenerator = (): IdGenerator => dependencyContainer.resolve(DependencyToken.IdGenerator);

export const uploadImage = async (ctx: Context) => {
    const file = ctx.request.files?.file as unknown as PersistentFile | undefined;

    if (!file) {
        ctx.status = 400;
        ctx.body = { error: 'File is required' };
        return;
    }

    try {
        const imageId = getIdGenerator().generate();
        const fileBuffer = fs.readFileSync(file.filepath);
        const contentType = file.mimetype || 'application/octet-stream';

        await getImageService().uploadImage(imageId, fileBuffer, contentType);

        ctx.status = 201;
        ctx.body = { imageId };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;
        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const getImage = async (ctx: Context) => {
    const { name } = ctx.params;

    try {
        const { stream, contentType, cacheControl } = await getImageService().getImage(name);

        ctx.set('Content-Type', contentType);
        ctx.set('Cache-Control', cacheControl);
        ctx.body = stream;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;

        if (err.status === 404) {
            ctx.body = { error: 'Image not found' };
        } else {
            ctx.body = { error: err.message ?? 'Internal Server Error' };
        }
    }
};
