import { Logger } from '@igor-siergiej/api-utils';

import { ImageGenerator, ImageStore } from './types';

export class ImageService {
    constructor(
        private readonly store: ImageStore,
        private readonly generator?: ImageGenerator,
        private readonly logger?: Logger
    ) {}

    async getImage(name: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string; cacheControl: string }> {
        if (!name) {
            throw Object.assign(new Error('Image name is required'), { status: 400 });
        }

        try {
            const head = await this.store.getHeadObject(name);
            const contentType = head?.metaData?.['content-type'] ?? 'image/jpeg';
            const stream = await this.store.getObjectStream(name);

            return {
                stream,
                contentType,
                cacheControl: 'public, max-age=31536000, immutable'
            };
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
    }
}
