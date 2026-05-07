import fs from 'node:fs';
import type { DraftType, PersistentFile } from '@jewellery-catalogue/types';
import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { DraftService } from '../../domain/DraftService';

const getDraftService = (): DraftService => dependencyContainer.resolve(DependencyToken.DraftService);

export const getDrafts = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const type = ctx.query.type as DraftType | undefined;

    try {
        const drafts = await getDraftService().getDraftsByUserId(userId, type);

        ctx.body = drafts;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const getDraft = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { id } = ctx.params;

    try {
        const draft = await getDraftService().getDraft(id, userId);

        ctx.body = draft;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const createDraft = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { type, name, data } = ctx.request.body as {
        type: DraftType;
        name: string;
        data: Record<string, unknown>;
    };

    try {
        const draft = await getDraftService().createDraft(userId, type, name, data ?? {});

        ctx.status = 201;
        ctx.body = draft;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const updateDraft = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { id } = ctx.params;
    const { name, data, imageId } = ctx.request.body as {
        name: string;
        data: Record<string, unknown>;
        imageId?: string;
    };

    try {
        const draft = await getDraftService().updateDraft(id, userId, name, data ?? {}, imageId);

        ctx.body = draft;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const uploadDraftImage = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { id } = ctx.params;
    const file = ctx.request.files?.file as unknown as PersistentFile;

    if (!file) {
        ctx.status = 400;
        ctx.body = { error: 'File is required' };
        return;
    }

    try {
        const fileBuffer = fs.readFileSync(file.filepath);
        const contentType = file.mimetype || 'application/octet-stream';

        const draft = await getDraftService().uploadDraftImage(id, userId, fileBuffer, contentType);

        ctx.body = draft;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const deleteDraft = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { id } = ctx.params;

    try {
        await getDraftService().deleteDraft(id, userId);

        ctx.status = 200;
        ctx.body = { message: 'Draft deleted successfully' };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};
