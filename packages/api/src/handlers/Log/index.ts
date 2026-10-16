import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { Context } from 'hono';
import { z } from 'zod';

type Ctx = Context<{ Variables: { userId: string } }>;

export const MAX_LOGS_PER_BATCH = 20;
export const MAX_LOG_LINES_PER_MINUTE = 120;
const WINDOW_MS = 60_000;
const MAX_CONTEXT_CHARS = 4000;

const logEntrySchema = z.object({
    level: z.enum(['info', 'warn', 'error']),
    message: z.string().min(1).max(1000),
    context: z
        .record(z.string(), z.unknown())
        .refine((context) => JSON.stringify(context).length <= MAX_CONTEXT_CHARS, 'context too large')
        .optional(),
    url: z.string().max(500).optional(),
    timestamp: z.string().max(40).optional(),
});

const logBatchSchema = z.object({
    logs: z.array(logEntrySchema).min(1).max(MAX_LOGS_PER_BATCH),
});

interface LineBudget {
    startedAt: number;
    count: number;
}

interface ReceiveLogsDeps {
    logger: () => Logger;
    now?: () => number;
}

// Writes browser log lines to stdout, where promtail ships them to Loki like the API's own lines.
// Each user gets a fixed per-minute line budget so a render loop can't flood Loki.
export const createReceiveLogs = ({ logger, now = Date.now }: ReceiveLogsDeps) => {
    const budgets = new Map<string, LineBudget>();

    const takeBudget = (userId: string, lines: number): boolean => {
        const at = now();
        const current = budgets.get(userId);
        const budget = current && at - current.startedAt < WINDOW_MS ? current : { startedAt: at, count: 0 };
        budgets.set(userId, budget);
        if (budget.count + lines > MAX_LOG_LINES_PER_MINUTE) {
            return false;
        }
        budget.count += lines;
        return true;
    };

    return async (c: Ctx) => {
        const parsed = logBatchSchema.safeParse(await c.req.json().catch(() => undefined));
        if (!parsed.success) {
            throw new APIError('Invalid log batch', 400);
        }

        const userId = c.get('userId');
        const { logs } = parsed.data;
        if (!takeBudget(userId, logs.length)) {
            return c.json({ error: 'Log rate limit exceeded' }, 429);
        }

        const userAgent = c.req.header('user-agent') ?? 'unknown';
        for (const { level, message, context, url, timestamp } of logs) {
            // Server-observed fields go last so a client can't overwrite who sent the line.
            logger()[level](message, {
                ...context,
                url,
                clientTimestamp: timestamp,
                source: 'frontend',
                userId,
                userAgent,
            });
        }

        return c.body(null, 204);
    };
};
