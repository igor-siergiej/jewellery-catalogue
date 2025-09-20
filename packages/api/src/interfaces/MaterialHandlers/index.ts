import { FormMaterial } from '@jewellery-catalogue/types';
import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { MaterialService } from '../../domain/MaterialService';

const getMaterialService = (): MaterialService =>
    dependencyContainer.resolve(DependencyToken.MaterialService);

export const getMaterials = async (ctx: Context) => {
    const { catalogueId } = ctx.params;

    try {
        const materials = await getMaterialService().getMaterialsByCatalogue(catalogueId);

        ctx.body = materials;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const getMaterial = async (ctx: Context) => {
    const { id } = ctx.params;

    try {
        const material = await getMaterialService().getMaterial(id);

        ctx.body = material;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const addMaterial = async (ctx: Context) => {
    const { catalogueId } = ctx.params;
    const materialData = ctx.request.body as FormMaterial;

    try {
        const material = await getMaterialService().addMaterial(catalogueId, materialData);

        ctx.status = 200;
        ctx.body = material;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const updateMaterial = async (ctx: Context) => {
    const { id } = ctx.params;
    const updates = ctx.request.body;

    try {
        const material = await getMaterialService().updateMaterial(id, updates);

        ctx.body = material;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const deleteMaterial = async (ctx: Context) => {
    const { id } = ctx.params;

    try {
        await getMaterialService().deleteMaterial(id);

        ctx.status = 200;
        ctx.body = { message: 'Material deleted successfully' };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;

        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};
