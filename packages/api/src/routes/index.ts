import { authenticate } from '@imapps/api-utils/hono';
import { Hono } from 'hono';

import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import { addDesign, deleteDesign, editDesignProperties, getDesign, getDesigns, updateDesign } from '../handlers/Design';
import { createDraft, deleteDraft, getDraft, getDrafts, updateDraft, uploadDraftImage } from '../handlers/Draft';
import {
    createDesignFromEtsyListing,
    disconnectEtsyConnection,
    etsyOAuthCallback,
    getEtsyConnectionStatus,
    getEtsyShippingProfiles,
    getEtsyShopListings,
    getEtsyTaxonomy,
    linkEtsyListingToDesign,
    pushDesignToEtsy,
    refreshDesignEtsyStatus,
    startEtsyOAuth,
    syncDesignEtsyQuantity,
} from '../handlers/Etsy';
import { getImage, uploadImage } from '../handlers/Image';
import {
    addMaterial,
    deleteMaterial,
    getMaterial,
    getMaterials,
    recalculateMaterialPrices,
    updateMaterial,
} from '../handlers/Material';
import { getUserSettings, recalculatePrices, updateUserSettings } from '../handlers/UserSettings';

type Env = { Variables: { userId: string } };

export const createRoutes = (): Hono<Env> => {
    const app = new Hono<Env>();

    app.get('/api/health', async (c) => {
        try {
            const databaseConnectionExists = await dependencyContainer.resolve(DependencyToken.Database).ping();
            return c.body(null, databaseConnectionExists ? 200 : 500);
        } catch {
            return c.body(null, 500);
        }
    });

    app.get('/api/user-settings', authenticate, getUserSettings);
    app.put('/api/user-settings', authenticate, updateUserSettings);

    app.get('/api/etsy/oauth/start', authenticate, startEtsyOAuth);
    app.get('/api/etsy/oauth/callback', etsyOAuthCallback);
    app.get('/api/etsy/connection', authenticate, getEtsyConnectionStatus);
    app.delete('/api/etsy/connection', authenticate, disconnectEtsyConnection);
    app.post('/api/designs/:id/etsy-push', authenticate, pushDesignToEtsy);
    app.get('/api/etsy/taxonomy', authenticate, getEtsyTaxonomy);
    app.get('/api/etsy/shipping-profiles', authenticate, getEtsyShippingProfiles);
    app.get('/api/etsy/listings', authenticate, getEtsyShopListings);
    app.post('/api/etsy/reconcile/create', authenticate, createDesignFromEtsyListing);
    app.post('/api/etsy/reconcile/link', authenticate, linkEtsyListingToDesign);
    app.get('/api/designs/:id/etsy-status', authenticate, refreshDesignEtsyStatus);
    app.post('/api/designs/:id/etsy-sync-quantity', authenticate, syncDesignEtsyQuantity);

    app.get('/api/designs', authenticate, getDesigns);
    app.post('/api/designs', authenticate, addDesign);
    app.post('/api/designs/recalculate-prices', authenticate, recalculatePrices);
    app.get('/api/designs/:id', authenticate, getDesign);
    app.put('/api/designs/:id', authenticate, updateDesign);
    app.patch('/api/designs/:id', authenticate, editDesignProperties);
    app.delete('/api/designs/:id', authenticate, deleteDesign);

    app.get('/api/materials', authenticate, getMaterials);
    app.post('/api/materials', authenticate, addMaterial);
    app.get('/api/materials/:id', authenticate, getMaterial);
    app.put('/api/materials/:id', authenticate, updateMaterial);
    app.post('/api/materials/:id/recalculate-prices', authenticate, recalculateMaterialPrices);
    app.delete('/api/materials/:id', authenticate, deleteMaterial);

    app.get('/api/drafts', authenticate, getDrafts);
    app.post('/api/drafts', authenticate, createDraft);
    app.get('/api/drafts/:id', authenticate, getDraft);
    app.put('/api/drafts/:id', authenticate, updateDraft);
    app.post('/api/drafts/:id/image', authenticate, uploadDraftImage);
    app.delete('/api/drafts/:id', authenticate, deleteDraft);

    app.post('/api/images', authenticate, uploadImage);
    app.get('/api/image/:name', getImage);

    return app;
};
