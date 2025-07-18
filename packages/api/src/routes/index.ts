import Router from 'koa-router';
import { getCatalogue } from './getCatalogue';
import { addCatalogue } from './addCatalogue';
import { addMaterial } from './addMaterial';
import { getMaterials } from './getMaterials';
import { getDesigns } from './getDesigns';
import { addDesign } from './addDesign';
import { getImage } from './getImage';

const router = new Router();

router.get('/api/catalogue/:id', getCatalogue);
router.post('/api/catalogue', addCatalogue);
router.get('/api/materials/:catalogueId', getMaterials);
router.post('/api/materials/:catalogueId', addMaterial);
router.get('/api/designs/:catalogueId', getDesigns);
router.post('/api/designs/:catalogueId', addDesign);
router.get('/api/image/:id', getImage);

export default router;
