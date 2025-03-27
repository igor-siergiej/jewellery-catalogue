import Router from 'koa-router';
import { getCatalogue } from './getCatalogue';
import { addMaterial } from './addMaterial';
import { getMaterials } from './getMaterials';

export const catalogueId = process.env.CATALOGUE_ID;

const router = new Router();

router.get('/api/catalogue', getCatalogue);
router.get('/api/materials', getMaterials);
router.post('/api/materials', addMaterial);

export default router;
