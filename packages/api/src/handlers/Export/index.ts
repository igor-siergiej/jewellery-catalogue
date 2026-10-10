import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';

type Ctx = Context<{ Variables: { userId: string } }>;

const getExportService = () => dependencyContainer.resolve(DependencyToken.ExportService);
const today = () => new Date().toISOString().slice(0, 10);

const download = (c: Ctx, body: string, contentType: string, filename: string) => {
    c.header('Content-Type', contentType);
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    c.header('Cache-Control', 'no-store');
    return c.body(body);
};

export const exportMaterialsCsv = async (c: Ctx) =>
    download(
        c,
        await getExportService().materialsCsv(c.get('userId')),
        'text/csv; charset=utf-8',
        `materials-${today()}.csv`
    );

export const exportDesignsCsv = async (c: Ctx) =>
    download(
        c,
        await getExportService().designsCsv(c.get('userId')),
        'text/csv; charset=utf-8',
        `designs-${today()}.csv`
    );

export const exportBackupJson = async (c: Ctx) =>
    download(
        c,
        JSON.stringify(await getExportService().backup(c.get('userId')), null, 2),
        'application/json; charset=utf-8',
        `jewellery-catalogue-backup-${today()}.json`
    );
