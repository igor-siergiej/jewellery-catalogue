import { ObjectStoreConnection } from '@igor-siergiej/api-utils';

import { ImageStore } from '../../domain/ImageService/types';

export class BucketStore implements ImageStore {
    constructor(
        private readonly bucket: ObjectStoreConnection
    ) {}

    async getHeadObject(name: string): Promise<{ metaData?: { 'content-type'?: string } } | null> {
        try {
            const stat = await this.bucket.statObject(name);
            return {
                metaData: {
                    'content-type': stat?.metaData?.['content-type']
                }
            };
        } catch {
            return null;
        }
    }

    async getObjectStream(name: string): Promise<NodeJS.ReadableStream> {
        return this.bucket.getObjectStream(name);
    }

    async putObject(name: string, buffer: Buffer, options?: { contentType: string }): Promise<void> {
        await this.bucket.putObject(name, buffer, options);
    }
}
