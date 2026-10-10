export interface ImageStore {
    getHeadObject(name: string): Promise<{ metaData?: { 'content-type'?: string } } | null>;
    getObjectStream(name: string): Promise<NodeJS.ReadableStream>;
    putObject(name: string, buffer: Buffer, options?: { contentType: string }): Promise<void>;
}

export interface ImageGenerator {
    generateImage(prompt: string): Promise<{ buffer: Buffer; contentType: string }>;
}

export const IMAGE_SIZES = ['thumb', 'display'] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export interface ImageResizer {
    // Returns a WebP no larger than maxDimension on either side (never upscaled).
    toWebp(buffer: Buffer, maxDimension: number): Promise<Buffer>;
}
