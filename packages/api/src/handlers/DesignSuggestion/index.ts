import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';

type Ctx = Context<{ Variables: { userId: string } }>;

const asArray = (value: unknown): unknown[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

// multipart: `files` (new photos) and/or `imageIds` (photos already uploaded, e.g. from a draft)
export const suggestDesignFromPhoto = async (c: Ctx) => {
    const body = await c.req.parseBody({ all: true });
    const files = asArray(body.files).filter((f): f is File => f instanceof File);
    const imageIds = asArray(body.imageIds).filter((id): id is string => typeof id === 'string' && id.length > 0);

    const photos = await Promise.all(
        files.map(async (file) => ({
            buffer: Buffer.from(await file.arrayBuffer()),
            contentType: file.type || 'application/octet-stream',
        }))
    );

    const suggestion = await dependencyContainer
        .resolve(DependencyToken.DesignSuggestionService)
        .suggest(c.get('userId'), { photos, imageIds });
    return c.json(suggestion, 200);
};
