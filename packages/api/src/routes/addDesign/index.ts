import { Context } from 'koa';
import { ObjectId } from 'mongodb';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { Catalogue, Design, PersistentFile, UploadDesign } from '@jewellery-catalogue/types';
import { CollectionName } from '../../database/types';

export const addDesign = async (ctx: Context) => {
    const { catalogueId } = ctx.params;
    const file = ctx.request.files.file as unknown as PersistentFile;
    const imageId = new ObjectId();

    const { name, description, timeRequired, materials, totalMaterialCosts, price } = ctx.request.body as Partial<UploadDesign>;

    if (!catalogueId) {
        ctx.status = 400;
        ctx.body = { error: 'Catalogue ID is required' };
        return;
    }

    const bucket = DependencyContainer.getInstance().resolve(DependencyToken.Bucket);

    await bucket.addImage(imageId.toString(), file);

    const design: Design = {
        id: new ObjectId().toString(),
        name,
        description,
        timeRequired,
        totalMaterialCosts,
        price,
        imageId: imageId.toString(),
        materials: JSON.parse(materials)
    };

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database connection failed' };
        return;
    }

    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);

    const updated = await collection.findOneAndUpdate({ _id: new ObjectId(catalogueId) }, { $push: { designs: design } }, { returnDocument: 'after' });

    if (!updated) {
        ctx.status = 404;
        ctx.body = { error: 'Catalogue not found' };
        return;
    }

    ctx.status = 200;
    ctx.body = updated.designs;
};
