import { describe, expect, it } from 'bun:test';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import * as designHandlers from './index';

const fakeDesign = { id: 'd1', name: 'Ring' };
const addDesignCalls: unknown[][] = [];

if (!(DependencyToken.DesignService in (dependencyContainer as any).instances)) {
    (dependencyContainer as any).instances[DependencyToken.DesignService] = {
        addDesign: async (...args: unknown[]) => {
            addDesignCalls.push(args);

            return fakeDesign;
        },
    };
}

const makeCtx = (opts: { contentType: string; json?: unknown; form?: Record<string, unknown> }) => {
    const captured: { body?: unknown; status?: number } = {};

    return {
        ctx: {
            get: (k: string) => (k === 'userId' ? 'user1' : undefined),
            req: {
                header: (h: string) => (h.toLowerCase() === 'content-type' ? opts.contentType : undefined),
                json: async () => opts.json,
                parseBody: async () => opts.form ?? {},
                param: () => 'd1',
            },
            json: (body: unknown, status?: number) => {
                captured.body = body;
                captured.status = status ?? 200;

                return captured;
            },
        } as any,
        captured,
    };
};

describe('addDesign body parsing', () => {
    it('accepts a JSON body with existingImageIds', async () => {
        const { ctx, captured } = makeCtx({
            contentType: 'application/json',
            json: { name: 'Ring', existingImageIds: JSON.stringify(['img-1']) },
        });

        await designHandlers.addDesign(ctx);
        expect(captured.status).toBe(200);
        expect(captured.body).toBe(fakeDesign);
    });

    it('accepts a JSON body with no images', async () => {
        const { ctx, captured } = makeCtx({ contentType: 'application/json', json: { name: 'Ring' } });

        await designHandlers.addDesign(ctx);
        expect(captured.status).toBe(200);
        expect(addDesignCalls.at(-1)?.[1]).toEqual([]);
        expect(addDesignCalls.at(-1)?.[2]).toEqual([]);
    });

    it('accepts a multipart body with no files and no existingImageIds', async () => {
        const { ctx, captured } = makeCtx({ contentType: 'multipart/form-data; boundary=x', form: { name: 'Ring' } });

        await designHandlers.addDesign(ctx);
        expect(captured.status).toBe(200);
    });

    it('accepts a multipart body with existingImageIds', async () => {
        const { ctx, captured } = makeCtx({
            contentType: 'multipart/form-data; boundary=x',
            form: { name: 'Ring', existingImageIds: JSON.stringify(['img-1']) },
        });

        await designHandlers.addDesign(ctx);
        expect(captured.status).toBe(200);
    });
});

describe('Design Handlers', () => {
    it('should export getDesigns', () => {
        expect(designHandlers.getDesigns).toBeDefined();
        expect(typeof designHandlers.getDesigns).toBe('function');
    });

    it('should export getDesign', () => {
        expect(designHandlers.getDesign).toBeDefined();
        expect(typeof designHandlers.getDesign).toBe('function');
    });

    it('should export addDesign', () => {
        expect(designHandlers.addDesign).toBeDefined();
        expect(typeof designHandlers.addDesign).toBe('function');
    });

    it('should export updateDesign', () => {
        expect(designHandlers.updateDesign).toBeDefined();
        expect(typeof designHandlers.updateDesign).toBe('function');
    });

    it('should export editDesignProperties', () => {
        expect(designHandlers.editDesignProperties).toBeDefined();
        expect(typeof designHandlers.editDesignProperties).toBe('function');
    });

    it('should export deleteDesign', () => {
        expect(designHandlers.deleteDesign).toBeDefined();
        expect(typeof designHandlers.deleteDesign).toBe('function');
    });
});
