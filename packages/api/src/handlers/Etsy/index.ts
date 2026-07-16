import type { Context } from 'hono';

import { config } from '../../config';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { EtsyConnectionService } from '../../domain/EtsyConnectionService';

type AuthedCtx = Context<{ Variables: { userId: string } }>;

const getService = (): EtsyConnectionService => dependencyContainer.resolve(DependencyToken.EtsyConnectionService);

export const startEtsyOAuth = async (c: AuthedCtx) => c.json(getService().startAuthorization(c.get('userId')));

export const etsyOAuthCallback = async (c: Context) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const webAppUrl = config.get('webAppUrl');

    if (!code || !state) {
        return c.redirect(`${webAppUrl}/settings?etsy=error`);
    }

    try {
        await getService().handleCallback(code, state);
        return c.redirect(`${webAppUrl}/settings?etsy=connected`);
    } catch {
        return c.redirect(`${webAppUrl}/settings?etsy=error`);
    }
};

export const getEtsyConnectionStatus = async (c: AuthedCtx) => c.json(await getService().getStatus(c.get('userId')));

export const disconnectEtsyConnection = async (c: AuthedCtx) => {
    await getService().disconnect(c.get('userId'));
    return c.json({ message: 'Etsy connection deleted successfully' }, 200);
};
