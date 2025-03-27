import Router from 'koa-router';
import { getCatalogue } from './getCatalogue';
import { addMaterial } from './addMaterial';

export const catalogueId = process.env.CATALOGUE_ID;

const router = new Router();

router.get('/api/catalogue', getCatalogue);
router.post('/api/materials', addMaterial);

export default router;
