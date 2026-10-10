import { Hono } from 'hono';
import { config } from '../config';
import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import { addDesign, deleteDesign, editDesignProperties, getDesign, getDesigns, updateDesign } from '../handlers/Design';
import { suggestDesignPrice } from '../handlers/DesignSuggestion';
import { createDraft, deleteDraft, getDraft, getDrafts, updateDraft, uploadDraftImage } from '../handlers/Draft';
import {
    applyEtsyListingCopy,
    createDesignFromEtsyListing,
    disconnectEtsyConnection,
    etsyOAuthCallback,
    generateEtsyListingCopy,
    getEtsyConnectionStatus,
    getEtsyShippingProfiles,
    getEtsyShopListings,
    getEtsyTaxonomy,
    getUnmatchedEtsySales,
    linkEtsyListingToDesign,
    proposeEtsyListingCopy,
    pushDesignToEtsy,
    refreshDesignEtsyStatus,
    startEtsyOAuth,
    syncDesignEtsyQuantity,
} from '../handlers/Etsy';
import { exportBackupJson, exportDesignsCsv, exportMaterialsCsv } from '../handlers/Export';
import { addGoal, deleteGoal, getGoals, syncGoalEtsyValue, updateGoal } from '../handlers/Goal';
import { getImage, uploadImage } from '../handlers/Image';
import {
    addMaterial,
    deleteMaterial,
    getMaterial,
    getMaterials,
    recalculateMaterialPrices,
    updateMaterial,
} from '../handlers/Material';
import { getProducible, getShoppingList } from '../handlers/ProductionPlan';
import { getSalesReport } from '../handlers/Sales';
import { addTask, deleteTask, getTasks, updateTask } from '../handlers/Task';
import { getUserSettings, recalculatePrices, updateUserSettings } from '../handlers/UserSettings';
import { DEFAULT_FAL_MODEL } from '../infrastructure/FalVisionClient';
import { createAiUsageMiddleware } from '../middleware/aiUsage';
import { authenticate, authenticateImageRequest } from '../middleware/auth';

type Env = { Variables: { userId: string } };

const DEFAULT_AI_LIMIT_PER_HOUR = 20;
const DEFAULT_AI_LIMIT_PER_DAY = 100;

const aiUsage = createAiUsageMiddleware({
    repo: () => dependencyContainer.resolve(DependencyToken.AiUsageRepository),
    logger: () => dependencyContainer.resolve(DependencyToken.Logger),
    limits: () => ({
        perHour: config.get('aiLimitPerHour') ?? DEFAULT_AI_LIMIT_PER_HOUR,
        perDay: config.get('aiLimitPerDay') ?? DEFAULT_AI_LIMIT_PER_DAY,
    }),
    model: () => config.get('falModel') || DEFAULT_FAL_MODEL,
});

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
    app.post(
        '/api/designs/:id/etsy-listing/generate',
        authenticate,
        aiUsage('etsy.listingCopy'),
        generateEtsyListingCopy
    );
    app.post('/api/designs/:id/price-suggestion', authenticate, aiUsage('design.priceSuggestion'), suggestDesignPrice);
    app.get('/api/etsy/taxonomy', authenticate, getEtsyTaxonomy);
    app.get('/api/etsy/shipping-profiles', authenticate, getEtsyShippingProfiles);
    app.get('/api/etsy/listings', authenticate, getEtsyShopListings);
    app.post(
        '/api/etsy/listings/:listingId/copy/propose',
        authenticate,
        aiUsage('etsy.listingCopyRefresh'),
        proposeEtsyListingCopy
    );
    app.put('/api/etsy/listings/:listingId/copy', authenticate, applyEtsyListingCopy);
    app.get('/api/etsy/sales/unmatched', authenticate, getUnmatchedEtsySales);
    app.get('/api/sales/report', authenticate, getSalesReport);
    app.post('/api/etsy/reconcile/create', authenticate, createDesignFromEtsyListing);
    app.post('/api/etsy/reconcile/link', authenticate, linkEtsyListingToDesign);
    app.get('/api/designs/:id/etsy-status', authenticate, refreshDesignEtsyStatus);
    app.post('/api/designs/:id/etsy-sync-quantity', authenticate, syncDesignEtsyQuantity);

    app.get('/api/designs', authenticate, getDesigns);
    app.post('/api/designs', authenticate, addDesign);
    app.post('/api/designs/recalculate-prices', authenticate, recalculatePrices);
    app.get('/api/designs/producible', authenticate, getProducible);
    app.post('/api/shopping-list', authenticate, getShoppingList);
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

    app.get('/api/goals', authenticate, getGoals);
    app.post('/api/goals', authenticate, addGoal);
    app.put('/api/goals/:id', authenticate, updateGoal);
    app.post('/api/goals/:id/etsy-sync', authenticate, syncGoalEtsyValue);
    app.delete('/api/goals/:id', authenticate, deleteGoal);

    app.get('/api/tasks', authenticate, getTasks);
    app.post('/api/tasks', authenticate, addTask);
    app.put('/api/tasks/:id', authenticate, updateTask);
    app.delete('/api/tasks/:id', authenticate, deleteTask);

    app.get('/api/export/materials.csv', authenticate, exportMaterialsCsv);
    app.get('/api/export/designs.csv', authenticate, exportDesignsCsv);
    app.get('/api/export/backup.json', authenticate, exportBackupJson);

    app.post('/api/images', authenticate, uploadImage);
    app.get('/api/image/:name', authenticateImageRequest, getImage);

    return app;
};
