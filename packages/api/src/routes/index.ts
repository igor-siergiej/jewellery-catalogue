import Router from 'koa-router';

import { addCatalogue } from './addCatalogue';
import { addDesign } from './addDesign';
import { addMaterial } from './addMaterial';
import { getCatalogue } from './getCatalogue';
import { getDesigns } from './getDesigns';
import { getImage } from './getImage';
import { getMaterials } from './getMaterials';

const router = new Router();

// Health check endpoint
router.get('/health', async (ctx) => {
    ctx.status = 200;
    ctx.body = { status: 'healthy', service: 'api', timestamp: new Date().toISOString() };
});

router.get('/api/catalogue/:id', getCatalogue);
router.post('/api/catalogue', addCatalogue);
router.get('/api/materials/:catalogueId', getMaterials);
router.post('/api/materials/:catalogueId', addMaterial);
router.get('/api/designs/:catalogueId', getDesigns);
router.post('/api/designs/:catalogueId', addDesign);
router.get('/api/image/:id', getImage);

export default router;
