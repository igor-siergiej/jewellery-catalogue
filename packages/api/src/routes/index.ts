import { authenticate } from '@imapps/api-utils/hono';
import { Hono } from 'hono';

import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import {
    addDesign,
    commitImport,
    deleteDesign,
    editDesignProperties,
    getDesign,
    getDesigns,
    previewImport,
    updateDesign,
} from '../handlers/Design';
import { createDraft, deleteDraft, getDraft, getDrafts, updateDraft, uploadDraftImage } from '../handlers/Draft';
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

    app.get('/api/designs', authenticate, getDesigns);
    app.post('/api/designs', authenticate, addDesign);
    app.post('/api/designs/recalculate-prices', authenticate, recalculatePrices);
    app.post('/api/designs/import/preview', authenticate, previewImport);
    app.post('/api/designs/import/commit', authenticate, commitImport);
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
