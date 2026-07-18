import { APIError } from '@imapps/api-utils/hono';
import type { EditDesign, UploadDesign } from '@jewellery-catalogue/types';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { DesignService } from '../../domain/DesignService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getDesignService = (): DesignService => dependencyContainer.resolve(DependencyToken.DesignService);

const collectFiles = (value: unknown): File[] => {
    if (!value) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr.filter((f): f is File => f instanceof File);
};

const toImageBuffer = async (file: File) => ({
    buffer: Buffer.from(await file.arrayBuffer()),
    contentType: file.type || 'application/octet-stream',
});

export const getDesigns = async (c: Ctx) => {
    const designs = await getDesignService().getDesignsByUserId(c.get('userId'));
    return c.json(designs);
};

export const getDesign = async (c: Ctx) => {
    const design = await getDesignService().getDesign(c.req.param('id'), c.get('userId'));
    return c.json(design);
};

export const addDesign = async (c: Ctx) => {
    const userId = c.get('userId');
    const isJson = (c.req.header('content-type') ?? '').includes('application/json');
    const body = isJson ? await c.req.json() : await c.req.parseBody({ all: true });
    const files = isJson ? [] : collectFiles(body.files);
    const diagramFiles = isJson ? [] : collectFiles(body.diagramFiles);

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
        makingNotes,
        existingImageIds: existingImageIdsRaw,
        existingDiagramImageIds: existingDiagramImageIdsRaw,
    } = body as unknown as Partial<UploadDesign> & {
        existingImageIds?: string;
        existingDiagramImageIds?: string;
        designType?: string;
    };

    const existingImageIds: string[] =
        typeof existingImageIdsRaw === 'string' && existingImageIdsRaw ? JSON.parse(existingImageIdsRaw) : [];
    const existingDiagramImageIds: string[] =
        typeof existingDiagramImageIdsRaw === 'string' && existingDiagramImageIdsRaw
            ? JSON.parse(existingDiagramImageIdsRaw)
            : [];

    if (files.length === 0 && existingImageIds.length === 0) {
        throw new APIError('At least one image file or imageId is required', 400);
    }

    const designData: UploadDesign = {
        name: name!,
        description: description!,
        timeRequired: timeRequired!,
        materials: materials!,
        totalMaterialCosts: Number(totalMaterialCosts),
        price: Number(price),
        image: files[0]! as unknown as UploadDesign['image'],
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
        variationGroups,
        variants,
        designType,
        makingNotes,
    };

    const imageBuffers = await Promise.all(files.map(toImageBuffer));
    const diagramImageBuffers = await Promise.all(diagramFiles.map(toImageBuffer));
    const design = await getDesignService().addDesign(
        designData,
        imageBuffers,
        existingImageIds,
        diagramImageBuffers,
        existingDiagramImageIds,
        userId
    );
    return c.json(design, 200);
};

export const updateDesign = async (c: Ctx) => {
    const updates = await c.req.json();
    const design = await getDesignService().updateDesign(c.req.param('id'), updates, c.get('userId'));
    return c.json(design);
};

export const editDesignProperties = async (c: Ctx) => {
    const userId = c.get('userId');
    const body = await c.req.parseBody({ all: true });
    const files = collectFiles(body.files);
    const diagramFiles = collectFiles(body.diagramFiles);

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
        makingNotes,
        keepImageIds: keepImageIdsRaw,
        keepDiagramImageIds: keepDiagramImageIdsRaw,
    } = body as unknown as Partial<EditDesign> & {
        lowStockThreshold?: string;
        variationGroups?: string;
        variants?: string;
        keepImageIds?: string;
        keepDiagramImageIds?: string;
        designType?: string;
    };

    const keepImageIds: string[] =
        typeof keepImageIdsRaw === 'string' && keepImageIdsRaw ? JSON.parse(keepImageIdsRaw) : [];
    const keepDiagramImageIds: string[] =
        typeof keepDiagramImageIdsRaw === 'string' && keepDiagramImageIdsRaw ? JSON.parse(keepDiagramImageIdsRaw) : [];

    const imageBuffers = await Promise.all(files.map(toImageBuffer));
    const diagramImageBuffers = await Promise.all(diagramFiles.map(toImageBuffer));
    const updates: EditDesign = {};

    if (name) updates.name = name as EditDesign['name'];
    if (description !== undefined) updates.description = description as EditDesign['description'];
    if (timeRequired) updates.timeRequired = timeRequired as EditDesign['timeRequired'];
    if (materials) updates.materials = materials as EditDesign['materials'];
    if (totalMaterialCosts !== undefined) updates.totalMaterialCosts = Number(totalMaterialCosts);
    if (price !== undefined) updates.price = Number(price);
    if (variationGroups !== undefined) {
        updates.variationGroups = typeof variationGroups === 'string' ? JSON.parse(variationGroups) : variationGroups;
    }
    if (variants !== undefined) {
        updates.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }
    if (designType !== undefined) updates.designType = designType as EditDesign['designType'];
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = Number(lowStockThreshold);
    if (makingNotes !== undefined) updates.makingNotes = makingNotes as EditDesign['makingNotes'];

    const design = await getDesignService().editDesignProperties(
        c.req.param('id'),
        updates,
        imageBuffers,
        keepImageIds,
        diagramImageBuffers,
        keepDiagramImageIds,
        userId
    );
    return c.json(design, 200);
};

export const deleteDesign = async (c: Ctx) => {
    await getDesignService().deleteDesign(c.req.param('id'), c.get('userId'));
    return c.json({ message: 'Design deleted successfully' }, 200);
};
