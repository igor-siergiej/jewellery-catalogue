import type { ZodType } from 'zod';

export interface VisionCompletionOptions<T> {
    /** Identifies the call in logs, e.g. 'etsy.listingCopy'. */
    operation: string;
    schema: ZodType<T>;
    system: string;
    prompt: string;
    /** data: URIs or public URLs; empty means a text-only call. */
    imageUrls: string[];
}

export interface VisionLlm {
    isConfigured(): boolean;
    completeStructured<T>(opts: VisionCompletionOptions<T>): Promise<T>;
}
