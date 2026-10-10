import { APIError } from '@imapps/api-utils/hono';
import { shoppingListRequestSchema } from '@jewellery-catalogue/types';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';

type Ctx = Context<{ Variables: { userId: string } }>;

const getPlanner = () => dependencyContainer.resolve(DependencyToken.ProductionPlanner);

export const getProducible = async (c: Ctx) => c.json(await getPlanner().getProducible(c.get('userId')), 200);

export const getShoppingList = async (c: Ctx) => {
    const parsed = shoppingListRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
        throw new APIError('Body must be { items: [{ designId, variantId?, quantity }] } with at least one item', 400);
    }
    return c.json(await getPlanner().getShoppingList(c.get('userId'), parsed.data.items), 200);
};
