import { Readable } from 'node:stream';
import type { Logger } from '@imapps/api-utils';

import { streamToBuffer } from '../../utils/streamToBuffer';
import type { ImageGenerator, ImageResizer, ImageSize, ImageStore } from './types';
import { IMAGE_SIZES } from './types';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const MAX_DIMENSION: Record<ImageSize, number> = {
    thumb: 400,
    display: 1600,
};

const variantKey = (name: string, size: ImageSize) => `${name}__${size}.webp`;

interface StoredImage {
    stream: NodeJS.ReadableStream;
    contentType: string;
    cacheControl: string;
}

export class ImageService {
    constructor(
        private readonly store: ImageStore,
        readonly _generator?: ImageGenerator,
        private readonly logger?: Logger,
        private readonly resizer?: ImageResizer
    ) {}

    // Without a size this is always the untouched original (what Etsy push and the AI copy use).
    async getImage(name: string, size?: ImageSize): Promise<StoredImage> {
        if (!name) {
            throw Object.assign(new Error('Image name is required'), { status: 400 });
        }

        if (size && this.resizer) {
            const variant = await this.getVariant(name, size);
            if (variant) return variant;
        }

        try {
            const head = await this.store.getHeadObject(name);
            const contentType = head?.metaData?.['content-type'] ?? 'image/jpeg';
            const stream = await this.store.getObjectStream(name);

            return { stream, contentType, cacheControl: CACHE_CONTROL };
        } catch {
            this.logger?.warn('Image not found in store', { name });
            throw Object.assign(new Error('Image not found'), { status: 404 });
        }
    }

    async uploadImage(name: string, buffer: Buffer, contentType: string): Promise<void> {
        if (!name || !buffer) {
            throw Object.assign(new Error('Image name and buffer are required'), { status: 400 });
        }

        try {
            await this.store.putObject(name, buffer, { contentType });
            this.logger?.info('Image uploaded successfully', { name, contentType });
        } catch (error) {
            this.logger?.error('Failed to upload image', { name, error });
            throw Object.assign(new Error('Failed to upload image'), { status: 500 });
        }

        // Best effort: a failure here only means the size is generated on first request instead.
        for (const size of IMAGE_SIZES) {
            await this.createVariant(name, size, buffer).catch((error: unknown) =>
                this.logger?.warn('Failed to create resized image on upload', {
                    name,
                    size,
                    error: error instanceof Error ? error.message : error,
                })
            );
        }
    }

    private async createVariant(name: string, size: ImageSize, original: Buffer): Promise<Buffer> {
        if (!this.resizer) throw new Error('No image resizer configured');
        const resized = await this.resizer.toWebp(original, MAX_DIMENSION[size]);
        await this.store.putObject(variantKey(name, size), resized, { contentType: 'image/webp' });
        return resized;
    }

    // Serves a stored size, generating it from the original the first time (covers images
    // uploaded before resizing existed). Returns null to fall back to the original.
    private async getVariant(name: string, size: ImageSize): Promise<StoredImage | null> {
        const key = variantKey(name, size);

        if (await this.store.getHeadObject(key)) {
            return {
                stream: await this.store.getObjectStream(key),
                contentType: 'image/webp',
                cacheControl: CACHE_CONTROL,
            };
        }

        if (!(await this.store.getHeadObject(name))) return null;

        try {
            const original = await streamToBuffer(await this.store.getObjectStream(name));
            const resized = await this.createVariant(name, size, original);
            return { stream: Readable.from(resized), contentType: 'image/webp', cacheControl: CACHE_CONTROL };
        } catch (error) {
            this.logger?.warn('Failed to create resized image on request', {
                name,
                size,
                error: error instanceof Error ? error.message : error,
            });
            return null;
        }
    }
}
