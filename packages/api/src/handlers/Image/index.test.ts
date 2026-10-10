import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Readable } from 'node:stream';
import { APIError } from '@imapps/api-utils/hono';

import '../../test-setup';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { DesignRepository } from '../../domain/DesignRepository';
import type { DraftRepository } from '../../domain/DraftRepository';
import type { ImageService } from '../../domain/ImageService';
import { getImage } from './index';

// Reach into the singleton's private instance map to inject test doubles.
// One-time, named boundary cast — not raw external input.
const containerInstances = dependencyContainer as unknown as { instances: Record<string, unknown> };

const designImageBelongsToUser = mock(async (_imageId: string, _userId: string) => false);
const draftImageBelongsToUser = mock(async (_imageId: string, _userId: string) => false);
const imageServiceGet = mock<
    (name: string) => Promise<{
        stream: NodeJS.ReadableStream;
        contentType: string;
        cacheControl: string;
    }>
>(async () => ({
    stream: Readable.from(Buffer.from([])),
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000, immutable',
}));

const emptyStream = Readable.from(Buffer.from([]));

const installRepos = (designOwned: boolean, draftOwned: boolean) => {
    designImageBelongsToUser.mockImplementation(async () => designOwned);
    draftImageBelongsToUser.mockImplementation(async () => draftOwned);
    containerInstances.instances = {
        ...containerInstances.instances,
        [DependencyToken.DesignRepository]: {
            imageBelongsToUser: designImageBelongsToUser,
        } as Partial<DesignRepository>,
        [DependencyToken.DraftRepository]: { imageBelongsToUser: draftImageBelongsToUser } as Partial<DraftRepository>,
        [DependencyToken.ImageService]: { getImage: imageServiceGet } as Partial<ImageService>,
    };
};

const makeCtx = (name: string, userId: string, query: Record<string, string> = {}) => {
    const captured: { headers: Record<string, string>; body?: unknown; status?: number } = { headers: {} };
    const ctx = {
        get: (k: string) => (k === 'userId' ? userId : undefined),
        req: { param: () => name, query: (key: string) => query[key] },
        header: (h: string, v: string) => {
            captured.headers[h] = v;
        },
        body: (b: unknown) => {
            captured.body = b;
            return captured as never;
        },
    };
    return { ctx, captured };
};

describe('getImage', () => {
    beforeEach(() => {
        designImageBelongsToUser.mockReset();
        draftImageBelongsToUser.mockReset();
        imageServiceGet.mockReset();
        imageServiceGet.mockResolvedValue({
            stream: emptyStream,
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000, immutable',
        });
    });

    it('returns 404 when neither design nor draft owns the image (IDOR guard)', async () => {
        installRepos(false, false);
        const { ctx } = makeCtx('img-orphan', 'user-1');

        await expect(getImage(ctx as never)).rejects.toBeInstanceOf(APIError);
        await expect(getImage(ctx as never).catch((e: unknown) => e)).resolves.toMatchObject({ status: 404 });
        expect(imageServiceGet).not.toHaveBeenCalled();
    });

    it('serves the image when the design owns it', async () => {
        installRepos(true, false);
        const { ctx, captured } = makeCtx('img-owned', 'user-1');

        await getImage(ctx as never);

        expect(designImageBelongsToUser).toHaveBeenCalledWith('img-owned', 'user-1');
        expect(imageServiceGet).toHaveBeenCalledWith('img-owned', undefined);
        expect(captured.headers['Content-Type']).toBe('image/jpeg');
        expect(captured.headers['Cache-Control']).toBe('public, max-age=31536000, immutable');
    });

    it('serves the image when a draft owns it (even if no design does)', async () => {
        installRepos(false, true);
        const { ctx } = makeCtx('img-draft', 'user-1');

        await getImage(ctx as never);

        expect(draftImageBelongsToUser).toHaveBeenCalledWith('img-draft', 'user-1');
        expect(imageServiceGet).toHaveBeenCalledWith('img-draft', undefined);
    });

    it("does not serve another user's image (cross-user IDOR)", async () => {
        // Repos only return true when the imageId belongs to the userId passed in.
        // From the handler's perspective, both returning false for this user must produce a 404.
        installRepos(false, false);
        const { ctx } = makeCtx('img-other', 'user-1');

        await expect(getImage(ctx as never)).rejects.toMatchObject({ status: 404 });
    });

    it('passes a requested size through to the image service', async () => {
        installRepos(true, false);
        const { ctx } = makeCtx('img-owned', 'user-1', { size: 'thumb' });

        await getImage(ctx as never);

        expect(imageServiceGet).toHaveBeenCalledWith('img-owned', 'thumb');
    });

    it('applies the ownership check to resized images too', async () => {
        installRepos(false, false);
        const { ctx } = makeCtx('img-other', 'user-1', { size: 'display' });

        await expect(getImage(ctx as never)).rejects.toMatchObject({ status: 404 });
        expect(imageServiceGet).not.toHaveBeenCalled();
    });

    it('rejects an unknown size with 400', async () => {
        installRepos(true, false);
        const { ctx } = makeCtx('img-owned', 'user-1', { size: 'huge' });

        await expect(getImage(ctx as never)).rejects.toMatchObject({ status: 400 });
        expect(imageServiceGet).not.toHaveBeenCalled();
    });
});

describe('Image Handlers', () => {
    it('should export getImage', () => {
        expect(getImage).toBeDefined();
        expect(typeof getImage).toBe('function');
    });
});
