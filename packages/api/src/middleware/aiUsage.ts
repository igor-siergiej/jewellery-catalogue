import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { Context, Next } from 'hono';

import type { AiUsageRepository } from '../domain/AiUsageRepository';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface AiUsageLimits {
    perHour: number;
    perDay: number;
}

type AuthedContext = Context<{ Variables: { userId: string } }>;

// One limiter for every route that spends FAL_KEY credit: put it after `authenticate` on any new AI route.
export const createAiUsageMiddleware = (deps: {
    repo: () => AiUsageRepository;
    logger: () => Logger;
    limits: () => AiUsageLimits;
    model: () => string;
    now?: () => number;
}) => {
    const now = deps.now ?? Date.now;

    return (feature: string) => async (c: AuthedContext, next: Next) => {
        const userId = c.get('userId');
        const repo = deps.repo();
        const { perHour, perDay } = deps.limits();
        const at = now();

        const [lastHour, lastDay] = await Promise.all([
            repo.countSince(userId, new Date(at - HOUR_MS)),
            repo.countSince(userId, new Date(at - DAY_MS)),
        ]);
        if (lastHour >= perHour || lastDay >= perDay) {
            deps.logger().warn('AI usage limit reached', { userId, feature, lastHour, lastDay });
            throw new APIError(
                lastHour >= perHour
                    ? `AI limit reached: ${perHour} requests per hour. Try again later.`
                    : `AI limit reached: ${perDay} requests per day. Try again tomorrow.`,
                429
            );
        }

        await next();

        // Hono has already turned a thrown error into c.res by now, so status reflects failures too.
        const status = c.res.status;
        const entry = {
            userId,
            feature,
            model: deps.model(),
            latencyMs: now() - at,
            success: status < 400 && !c.error,
            status,
            at: new Date(at),
        };
        deps.logger().info('AI call', { ...entry, at: entry.at.toISOString() });
        await repo
            .record(entry)
            .catch((error: unknown) =>
                deps
                    .logger()
                    .error('Failed to record AI usage', { error: error instanceof Error ? error.message : error })
            );
    };
};
