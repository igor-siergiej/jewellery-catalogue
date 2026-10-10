import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';

type Ctx = Context<{ Variables: { userId: string } }>;

export const suggestDesignPrice = async (c: Ctx) => {
    const suggestion = await dependencyContainer
        .resolve(DependencyToken.PriceSuggestionService)
        .suggest(c.req.param('id'), c.get('userId'));
    return c.json(suggestion, 200);
};
