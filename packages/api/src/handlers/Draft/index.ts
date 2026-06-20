import { APIError } from '@imapps/api-utils/hono';
import type { DraftType, PersistentFile } from '@jewellery-catalogue/types';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { DraftService } from '../../domain/DraftService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getDraftService = (): DraftService => dependencyContainer.resolve(DependencyToken.DraftService);

export const getDrafts = async (c: Ctx) => {
    const type = c.req.query('type') as DraftType | undefined;
    const drafts = await getDraftService().getDraftsByUserId(c.get('userId'), type);
    return c.json(drafts);
};

export const getDraft = async (c: Ctx) => {
    const draft = await getDraftService().getDraft(c.req.param('id'), c.get('userId'));
    return c.json(draft);
};

export const createDraft = async (c: Ctx) => {
    const { type, name, data } = (await c.req.json()) as {
        type: DraftType;
        name: string;
        data: Record<string, unknown>;
    };
    const draft = await getDraftService().createDraft(c.get('userId'), type, name, data ?? {});
    return c.json(draft, 201);
};

export const updateDraft = async (c: Ctx) => {
    const { name, data, imageId } = (await c.req.json()) as {
        name: string;
        data: Record<string, unknown>;
        imageId?: string;
    };
    const draft = await getDraftService().updateDraft(c.req.param('id'), c.get('userId'), name, data ?? {}, imageId);
    return c.json(draft);
};

export const uploadDraftImage = async (c: Ctx) => {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!(file instanceof File)) {
        throw new APIError('File is required', 400);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/octet-stream';
    const draft = await getDraftService().uploadDraftImage(c.req.param('id'), c.get('userId'), fileBuffer, contentType);
    return c.json(draft);
};

export const deleteDraft = async (c: Ctx) => {
    await getDraftService().deleteDraft(c.req.param('id'), c.get('userId'));
    return c.json({ message: 'Draft deleted successfully' }, 200);
};

export type { PersistentFile };
