import { Readable } from 'node:stream';

import type { ImageStore } from '../../domain/ImageService/types';

interface StoredObject {
    buffer: Buffer;
    contentType?: string;
}

// Test-only stand-in for BucketStore, selected with IN_MEMORY_IMAGE_STORE=true so e2e runs
// need no S3/MinIO server. Objects live in process memory and are lost on restart.
export class InMemoryImageStore implements ImageStore {
    private readonly objects = new Map<string, StoredObject>();

    async getHeadObject(name: string): Promise<{ metaData?: { 'content-type'?: string } } | null> {
        const object = this.objects.get(name);
        return object ? { metaData: { 'content-type': object.contentType } } : null;
    }

    async getObjectStream(name: string): Promise<NodeJS.ReadableStream> {
        const object = this.objects.get(name);
        if (!object) throw new Error(`Object not found: ${name}`);
        return Readable.from(object.buffer);
    }

    async putObject(name: string, buffer: Buffer, options?: { contentType: string }): Promise<void> {
        this.objects.set(name, { buffer, contentType: options?.contentType });
    }
}
