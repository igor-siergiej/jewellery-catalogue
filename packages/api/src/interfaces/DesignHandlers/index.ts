import { PersistentFile, UploadDesign } from '@jewellery-catalogue/types';
import fs from 'fs';
import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { DesignService } from '../../domain/DesignService';

const getDesignService = (): DesignService =>
    dependencyContainer.resolve(DependencyToken.DesignService);

export const getDesigns = async (ctx: Context) => {
    const { catalogueId } = ctx.params;

    try {
        const designs = await getDesignService().getDesignsByCatalogue(catalogueId);

        ctx.body = designs;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const getDesign = async (ctx: Context) => {
    const { id } = ctx.params;

    try {
        const design = await getDesignService().getDesign(id);

        ctx.body = design;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const addDesign = async (ctx: Context) => {
    const { catalogueId } = ctx.params;
    const file = ctx.request.files?.file as unknown as PersistentFile;

    if (!file) {
        ctx.status = 400;
        ctx.body = { error: 'File is required' };
        return;
    }

    const { name, description, timeRequired, materials, totalMaterialCosts, price }
        = ctx.request.body as Partial<UploadDesign>;

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
            image: file
        };

        const design = await getDesignService().addDesign(catalogueId, designData, fileBuffer, contentType);

        ctx.status = 200;
        ctx.body = design;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const updateDesign = async (ctx: Context) => {
    const { id } = ctx.params;
    const updates = ctx.request.body;

    try {
        const design = await getDesignService().updateDesign(id, updates);

        ctx.body = design;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const deleteDesign = async (ctx: Context) => {
    const { id } = ctx.params;

    try {
        await getDesignService().deleteDesign(id);

        ctx.status = 200;
        ctx.body = { message: 'Design deleted successfully' };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};
