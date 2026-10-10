import { APIError } from '@imapps/api-utils/hono';
import type { Context } from 'hono';
import { z } from 'zod';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';

type Ctx = Context<{ Variables: { userId: string } }>;

const epochMsParam = z.coerce.number().int().nonnegative().optional();

export const getSalesReport = async (c: Ctx) => {
    const from = epochMsParam.safeParse(c.req.query('from') || undefined);
    const to = epochMsParam.safeParse(c.req.query('to') || undefined);
    if (!from.success || !to.success) {
        throw new APIError('from and to must be epoch milliseconds', 400);
    }

    const report = await dependencyContainer
        .resolve(DependencyToken.SalesReportService)
        .getReport(c.get('userId'), { from: from.data ?? null, to: to.data ?? null });
    return c.json(report, 200);
};
