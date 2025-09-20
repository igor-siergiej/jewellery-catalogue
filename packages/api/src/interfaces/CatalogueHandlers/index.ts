import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { CatalogueService } from '../../domain/CatalogueService';

const getCatalogueService = (): CatalogueService =>
    dependencyContainer.resolve(DependencyToken.CatalogueService);

export const getCatalogue = async (ctx: Context) => {
    const { id } = ctx.params;

    try {
        const catalogue = await getCatalogueService().getCatalogue(id);

        ctx.body = {
            id: catalogue._id,
            designs: catalogue.designs,
            materials: catalogue.materials
        };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const addCatalogue = async (ctx: Context) => {
    const { id } = ctx.request.body as { id?: string };

    try {
        const catalogue = await getCatalogueService().createCatalogue(id);

        ctx.status = 201;
        ctx.body = {
            id: catalogue._id,
            designs: catalogue.designs,
            materials: catalogue.materials
        };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const getAllCatalogues = async (ctx: Context) => {
    try {
        const catalogues = await getCatalogueService().getAllCatalogues();

        ctx.body = catalogues.map(catalogue => ({
            id: catalogue._id,
            designs: catalogue.designs,
            materials: catalogue.materials
        }));
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const deleteCatalogue = async (ctx: Context) => {
    const { id } = ctx.params;

    try {
        await getCatalogueService().deleteCatalogue(id);

        ctx.status = 200;
        ctx.body = { message: 'Catalogue deleted successfully' };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};
