import { APIError } from '@imapps/api-utils/hono';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { ImportRunService } from '../../domain/ImportRunService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getImportRunService = (): ImportRunService => dependencyContainer.resolve(DependencyToken.ImportRunService);

export const startImportRun = async (c: Ctx) => {
    const request = await c.req.json();
    if (!Array.isArray((request as { candidates?: unknown })?.candidates)) {
        throw new APIError('candidates array is required', 400);
    }
    if (
        typeof (request as { fileName?: unknown }).fileName !== 'string' ||
        !(request as { fileName: string }).fileName
    ) {
        throw new APIError('fileName is required', 400);
    }
    const run = await getImportRunService().start(request, c.get('userId'));
    return c.json({ runId: run.id }, 202);
};

export const getImportRuns = async (c: Ctx) => {
    return c.json(await getImportRunService().getRuns(c.get('userId')));
};

export const getImportRun = async (c: Ctx) => {
    return c.json(await getImportRunService().getRun(c.req.param('id'), c.get('userId')));
};

export const cancelImportRun = async (c: Ctx) => {
    return c.json(await getImportRunService().cancel(c.req.param('id'), c.get('userId')));
};
