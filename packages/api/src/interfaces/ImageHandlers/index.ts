import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { ImageService } from '../../domain/ImageService';

const getImageService = (): ImageService =>
    dependencyContainer.resolve(DependencyToken.ImageService);

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
