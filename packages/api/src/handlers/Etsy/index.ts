import type { Context } from 'hono';

import { config } from '../../config';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { EtsyConnectionService } from '../../domain/EtsyConnectionService';

type AuthedCtx = Context<{ Variables: { userId: string } }>;

const getService = (): EtsyConnectionService => dependencyContainer.resolve(DependencyToken.EtsyConnectionService);

export const startEtsyOAuth = async (c: AuthedCtx) => {
    const result = getService().startAuthorization(c.get('userId'));
    dependencyContainer.resolve(DependencyToken.Logger).info('Etsy OAuth start - generated authorize URL', {
        url: result.url,
    });
    return c.json(result);
};

export const etsyOAuthCallback = async (c: Context) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');
    const errorDescription = c.req.query('error_description');
    const webAppUrl = config.get('webAppUrl');
    const logger = dependencyContainer.resolve(DependencyToken.Logger);

    if (!code || !state) {
        logger.warn('Etsy OAuth callback missing code/state', {
            hasCode: !!code,
            hasState: !!state,
            error,
            errorDescription,
            rawUrl: c.req.url,
            allParams: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
        });
        return c.redirect(`${webAppUrl}/settings?etsy=error`);
    }

    try {
        await getService().handleCallback(code, state);
        return c.redirect(`${webAppUrl}/settings?etsy=connected`);
    } catch (err) {
        logger.error('Etsy OAuth callback failed', {
            message: err instanceof Error ? err.message : String(err),
        });
        return c.redirect(`${webAppUrl}/settings?etsy=error`);
    }
};

export const getEtsyConnectionStatus = async (c: AuthedCtx) => c.json(await getService().getStatus(c.get('userId')));

export const disconnectEtsyConnection = async (c: AuthedCtx) => {
    await getService().disconnect(c.get('userId'));
    return c.json({ message: 'Etsy connection deleted successfully' }, 200);
};
