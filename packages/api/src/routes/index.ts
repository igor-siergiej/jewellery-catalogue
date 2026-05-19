import Router from 'koa-router';

import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import { addDesign, deleteDesign, editDesignProperties, getDesign, getDesigns, updateDesign } from '../handlers/Design';
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
import { authenticate } from '../middleware/auth';

const router = new Router();

router.get('/api/health', async (ctx) => {
    ctx.status = 200;
    const databaseConnectionExists = dependencyContainer.resolve(DependencyToken.Database).ping();
    const bucketConnectionExists = dependencyContainer.resolve(DependencyToken.Bucket).ping();

    if (!databaseConnectionExists || !bucketConnectionExists) {
        ctx.status = 500;
    }

    ctx.status = 200;
});

router.get('/api/user-settings', authenticate, getUserSettings);
router.put('/api/user-settings', authenticate, updateUserSettings);

router.get('/api/designs', authenticate, getDesigns);
router.post('/api/designs', authenticate, addDesign);
router.post('/api/designs/recalculate-prices', authenticate, recalculatePrices);
router.get('/api/designs/:id', authenticate, getDesign);
router.put('/api/designs/:id', authenticate, updateDesign);
router.patch('/api/designs/:id', authenticate, editDesignProperties);
router.delete('/api/designs/:id', authenticate, deleteDesign);

router.get('/api/materials', authenticate, getMaterials);
router.post('/api/materials', authenticate, addMaterial);
router.get('/api/materials/:id', authenticate, getMaterial);
router.put('/api/materials/:id', authenticate, updateMaterial);
router.post('/api/materials/:id/recalculate-prices', authenticate, recalculateMaterialPrices);
router.delete('/api/materials/:id', authenticate, deleteMaterial);

// Draft routes
router.get('/api/drafts', authenticate, getDrafts);
router.post('/api/drafts', authenticate, createDraft);
router.get('/api/drafts/:id', authenticate, getDraft);
router.put('/api/drafts/:id', authenticate, updateDraft);
router.post('/api/drafts/:id/image', authenticate, uploadDraftImage);
router.delete('/api/drafts/:id', authenticate, deleteDraft);

// Image routes
router.post('/api/images', authenticate, uploadImage);
router.get('/api/image/:name', getImage);

export default router;
