import Router from 'koa-router';

import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import { addCatalogue, deleteCatalogue, getAllCatalogues, getCatalogue } from '../interfaces/CatalogueHandlers';
import { addDesign, deleteDesign, getDesign, getDesigns, updateDesign } from '../interfaces/DesignHandlers';
import { getImage } from '../interfaces/ImageHandlers';
import { addMaterial, deleteMaterial, getMaterial, getMaterials, updateMaterial } from '../interfaces/MaterialHandlers';

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

// Catalogue routes
router.get('/api/catalogues', getAllCatalogues);
router.get('/api/catalogue/:id', getCatalogue);
router.post('/api/catalogue', addCatalogue);
router.delete('/api/catalogue/:id', deleteCatalogue);

// Materials routes
router.get('/api/materials/:catalogueId', getMaterials);
router.get('/api/material/:id', getMaterial);
router.post('/api/materials/:catalogueId', addMaterial);
router.put('/api/material/:id', updateMaterial);
router.delete('/api/material/:id', deleteMaterial);

// Designs routes
router.get('/api/designs/:catalogueId', getDesigns);
router.get('/api/design/:id', getDesign);
router.post('/api/designs/:catalogueId', addDesign);
router.put('/api/design/:id', updateDesign);
router.delete('/api/design/:id', deleteDesign);

// Image routes
router.get('/api/image/:name', getImage);

export default router;
