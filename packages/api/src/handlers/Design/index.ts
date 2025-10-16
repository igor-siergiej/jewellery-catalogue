import fs from 'node:fs';
import type { EditDesign, PersistentFile, UploadDesign } from '@jewellery-catalogue/types';
import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { DesignService } from '../../domain/DesignService';

const getDesignService = (): DesignService => dependencyContainer.resolve(DependencyToken.DesignService);

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
    const file = ctx.request.files?.file as unknown as PersistentFile;

    if (!file) {
        ctx.status = 400;
        ctx.body = { error: 'File is required' };

        return;
    }

    const { name, description, timeRequired, materials, totalMaterialCosts, price } = ctx.request
        .body as Partial<UploadDesign>;

    try {
        // Read the file from filesystem and convert to Buffer
        const fileBuffer = fs.readFileSync(file.filepath);
        const contentType = file.mimetype || 'application/octet-stream';

        const designData: UploadDesign = {
            name: name!,
            description: description!,
            timeRequired: timeRequired!,
            materials: materials!,
            totalMaterialCosts: Number(totalMaterialCosts),
            price: Number(price),
            image: file,
        };

        const design = await getDesignService().addDesign(designData, fileBuffer, contentType, userId);

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
    const file = ctx.request.files?.file as unknown as PersistentFile | undefined;

    const { name, description, timeRequired, materials, totalMaterialCosts, price } = ctx.request
        .body as Partial<EditDesign>;

    try {
        let fileBuffer: Buffer | null = null;
        let contentType: string | null = null;

        // If a file is provided, read it
        if (file) {
            fileBuffer = fs.readFileSync(file.filepath);
            contentType = file.mimetype || 'application/octet-stream';
        }

        const updates: EditDesign = {};

        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (timeRequired) updates.timeRequired = timeRequired;
        if (materials) updates.materials = materials;
        if (totalMaterialCosts !== undefined) updates.totalMaterialCosts = Number(totalMaterialCosts);
        if (price !== undefined) updates.price = Number(price);

        const design = await getDesignService().editDesignProperties(id, updates, fileBuffer, contentType, userId);

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
