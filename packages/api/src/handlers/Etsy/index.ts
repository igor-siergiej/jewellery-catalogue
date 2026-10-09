import { APIError } from '@imapps/api-utils/hono';
import { etsyListingSchema } from '@jewellery-catalogue/types';
import type { Context } from 'hono';
import { z } from 'zod';

import { config } from '../../config';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { EtsyConnectionService } from '../../domain/EtsyConnectionService';
import type { EtsyPushService } from '../../domain/EtsyPushService';
import type { EtsyReconcileService } from '../../domain/EtsyReconcileService';
import type { EtsyStatusService } from '../../domain/EtsyStatusService';

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

const getPushService = (): EtsyPushService => dependencyContainer.resolve(DependencyToken.EtsyPushService);

const pushOverridesSchema = z.object({
    title: etsyListingSchema.shape.title.optional(),
    description: etsyListingSchema.shape.description.optional(),
    tags: etsyListingSchema.shape.tags.optional(),
    price: z.number().nonnegative().optional(),
});

export const pushDesignToEtsy = async (c: AuthedCtx) => {
    const parsed = pushOverridesSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        throw new APIError(`Invalid Etsy listing: ${parsed.error.issues.map((i) => i.message).join('; ')}`, 400);
    }

    try {
        const design = await getPushService().push(c.req.param('id'), c.get('userId'), parsed.data);
        return c.json(design, 200);
    } catch (err) {
        dependencyContainer.resolve(DependencyToken.Logger).error('Etsy push failed', {
            designId: c.req.param('id'),
            userId: c.get('userId'),
            status: err instanceof Error && 'status' in err ? (err as { status?: number }).status : undefined,
            message: err instanceof Error ? err.message : String(err),
        });
        throw err;
    }
};

export const getEtsyTaxonomy = async (c: AuthedCtx) => {
    const client = dependencyContainer.resolve(DependencyToken.EtsyClient);
    const nodes = await client.getSellerTaxonomyNodes();
    return c.json(nodes, 200);
};

export const getEtsyShippingProfiles = async (c: AuthedCtx) => {
    const { accessToken, shopId } = await getService().getPushCredentials(c.get('userId'));
    const client = dependencyContainer.resolve(DependencyToken.EtsyClient);
    const profiles = await client.getShopShippingProfiles(accessToken, shopId);
    return c.json(profiles, 200);
};

const getStatusService = (): EtsyStatusService => dependencyContainer.resolve(DependencyToken.EtsyStatusService);

export const refreshDesignEtsyStatus = async (c: AuthedCtx) => {
    const design = await getStatusService().refreshStatus(c.req.param('id'), c.get('userId'));
    return c.json(design, 200);
};

export const getEtsyShopListings = async (c: AuthedCtx) => {
    const listings = await getStatusService().listShopListings(c.get('userId'));
    return c.json(listings, 200);
};

export const syncDesignEtsyQuantity = async (c: AuthedCtx) => {
    const design = await getStatusService().syncQuantityFromEtsy(c.req.param('id'), c.get('userId'));
    return c.json(design, 200);
};

const getReconcileService = (): EtsyReconcileService =>
    dependencyContainer.resolve(DependencyToken.EtsyReconcileService);

export const createDesignFromEtsyListing = async (c: AuthedCtx) => {
    const { listingId } = (await c.req.json()) as { listingId: number };
    try {
        const result = await getReconcileService().createDesignFromListing(listingId, c.get('userId'));
        return c.json(result, 201);
    } catch (error) {
        dependencyContainer.resolve(DependencyToken.Logger).error('Etsy reconcile create failed', {
            listingId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
};

export const linkEtsyListingToDesign = async (c: AuthedCtx) => {
    const { listingId, designId } = (await c.req.json()) as { listingId: number; designId: string };
    try {
        await getReconcileService().linkListingToDesign(listingId, designId, c.get('userId'));
        return c.json({ message: 'Listing linked to design' }, 200);
    } catch (error) {
        dependencyContainer.resolve(DependencyToken.Logger).error('Etsy reconcile link failed', {
            listingId,
            designId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
};

export const generateEtsyListingCopy = async (c: AuthedCtx) => {
    const service = dependencyContainer.resolve(DependencyToken.EtsyListingCopyService);
    const copy = await service.generate(c.req.param('id'), c.get('userId'));
    return c.json(copy, 200);
};
