import Router from 'koa-router';

import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import { addDesign, deleteDesign, editDesignProperties, getDesign, getDesigns, updateDesign } from '../handlers/Design';
import { getImage } from '../handlers/Image';
import { addMaterial, deleteMaterial, getMaterial, getMaterials, updateMaterial } from '../handlers/Material';
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

router.get('/api/designs', authenticate, getDesigns);
router.post('/api/designs', authenticate, addDesign);
router.get('/api/designs/:id', authenticate, getDesign);
router.put('/api/designs/:id', authenticate, updateDesign);
router.patch('/api/designs/:id', authenticate, editDesignProperties);
router.delete('/api/designs/:id', authenticate, deleteDesign);

router.get('/api/materials', authenticate, getMaterials);
router.post('/api/materials', authenticate, addMaterial);
router.get('/api/materials/:id', authenticate, getMaterial);
router.put('/api/materials/:id', authenticate, updateMaterial);
router.delete('/api/materials/:id', authenticate, deleteMaterial);

// Image routes
router.get('/api/image/:name', getImage);

export default router;
