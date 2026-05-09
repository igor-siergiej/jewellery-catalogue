import fs from 'node:fs';
import type { Design, EditDesign, PersistentFile, UploadDesign } from '@jewellery-catalogue/types';
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
    const file = ctx.request.files?.file as unknown as PersistentFile | undefined;

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
        imageId: existingImageId,
    } = ctx.request.body as Partial<UploadDesign> & { imageId?: string };

    if (!file && !existingImageId) {
        ctx.status = 400;
        ctx.body = { error: 'File or imageId is required' };

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
            image: file!,
            lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
            variationGroups,
            variants,
            designType,
        };

        let design: Design;

        if (file) {
            const fileBuffer = fs.readFileSync(file.filepath);
            const contentType = file.mimetype || 'application/octet-stream';

            design = await getDesignService().addDesign(designData, fileBuffer, contentType, userId);
        } else {
            design = await getDesignService().addDesignWithImageId(designData, existingImageId!, userId);
        }

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
    } = ctx.request.body as Partial<EditDesign> & { variationGroups?: string; variants?: string };

    try {
        let fileBuffer: Buffer | null = null;
        let contentType: string | null = null;

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
        if (variationGroups !== undefined) {
            updates.variationGroups =
                typeof variationGroups === 'string' ? JSON.parse(variationGroups) : variationGroups;
        }
        if (variants !== undefined) {
            updates.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        }
        if (designType !== undefined) updates.designType = designType;

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
