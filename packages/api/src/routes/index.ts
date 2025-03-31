import Router from 'koa-router';
import { getCatalogue } from './getCatalogue';
import { addMaterial } from './addMaterial';
import { getMaterials } from './getMaterials';
import { getDesigns } from './getDesigns';

export const catalogueId = process.env.CATALOGUE_ID;

const router = new Router();

router.get('/api/catalogue', getCatalogue);
router.get('/api/materials', getMaterials);
router.post('/api/materials', addMaterial);
router.get('/api/designs', getDesigns)

export default router;
