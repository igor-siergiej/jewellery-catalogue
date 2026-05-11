import fs from 'node:fs';
import type { EditDesign, PersistentFile, UploadDesign } from '@jewellery-catalogue/types';
import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { DesignService } from '../../domain/DesignService';

const getDesignService = (): DesignService => dependencyContainer.resolve(DependencyToken.DesignService);

function normalizeFiles(f: unknown): PersistentFile[] {
    if (!f) return [];
    return Array.isArray(f) ? f : [f];
}

export const getDesigns = async (ctx: Context) => {
    const userId = ctx.state.userId;

    try {
        const designs = await getDesignService().getDesignsByUserId(userId);

        ctx.body = designs;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const getDesign = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { id } = ctx.params;

    try {
        const design = await getDesignService().getDesign(id, userId);

        ctx.body = design;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const addDesign = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const files = normalizeFiles(ctx.request.files?.files);

    const {
        name,
        description,
        timeRequired,
        materials,
        totalMaterialCosts,
        price,
        lowStockThreshold,
        variationGroups,
        variants,
        designType,
        existingImageIds: existingImageIdsRaw,
    } = ctx.request.body as Partial<UploadDesign> & { existingImageIds?: string; designType?: string };

    const existingImageIds: string[] = existingImageIdsRaw ? JSON.parse(existingImageIdsRaw) : [];

    if (files.length === 0 && existingImageIds.length === 0) {
        ctx.status = 400;
        ctx.body = { error: 'At least one image file or imageId is required' };

        return;
    }

    try {
        const designData: UploadDesign = {
            name: name!,
            description: description!,
            timeRequired: timeRequired!,
            materials: materials!,
            totalMaterialCosts: Number(totalMaterialCosts),
            price: Number(price),
            image: files[0]!,
            lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
            variationGroups,
            variants,
            designType,
        };

        const imageBuffers = files.map((file) => ({
            buffer: fs.readFileSync(file.filepath),
            contentType: file.mimetype || 'application/octet-stream',
        }));

        const design = await getDesignService().addDesign(designData, imageBuffers, existingImageIds, userId);

        ctx.status = 200;
        ctx.body = design;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const updateDesign = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { id } = ctx.params;
    const updates = ctx.request.body;

    try {
        const design = await getDesignService().updateDesign(id, updates, userId);

        ctx.body = design;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const editDesignProperties = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { id } = ctx.params;
    const files = normalizeFiles(ctx.request.files?.files);

    const {
        name,
        description,
        timeRequired,
        materials,
        totalMaterialCosts,
        price,
        variationGroups,
        variants,
        designType,
        keepImageIds: keepImageIdsRaw,
    } = ctx.request.body as Partial<EditDesign> & {
        variationGroups?: string;
        variants?: string;
        keepImageIds?: string;
        designType?: string;
    };

    const keepImageIds: string[] = keepImageIdsRaw ? JSON.parse(keepImageIdsRaw) : [];

    try {
        const imageBuffers = files.map((file) => ({
            buffer: fs.readFileSync(file.filepath),
            contentType: file.mimetype || 'application/octet-stream',
        }));

        const updates: EditDesign = {};

        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (timeRequired) updates.timeRequired = timeRequired;
        if (materials) updates.materials = materials;
        if (totalMaterialCosts !== undefined) updates.totalMaterialCosts = Number(totalMaterialCosts);
        if (price !== undefined) updates.price = Number(price);
        if (variationGroups !== undefined) {
            updates.variationGroups =
                typeof variationGroups === 'string' ? JSON.parse(variationGroups) : variationGroups;
        }
        if (variants !== undefined) {
            updates.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        }
        if (designType !== undefined) updates.designType = designType;

        const design = await getDesignService().editDesignProperties(id, updates, imageBuffers, keepImageIds, userId);

        ctx.status = 200;
        ctx.body = design;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const deleteDesign = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { id } = ctx.params;

    try {
        await getDesignService().deleteDesign(id, userId);

        ctx.status = 200;
        ctx.body = { message: 'Design deleted successfully' };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};
