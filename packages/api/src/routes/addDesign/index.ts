import { Context } from 'koa';
import { ObjectId } from 'mongodb';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { Catalogue, Design, PersistentFile, UploadDesign } from '@jewellery-catalogue/types';
import { CollectionName } from '../../database/types';
import { catalogueId } from '..';

export const addDesign = async (ctx: Context) => {
    const file = ctx.request.files.file as unknown as PersistentFile;
    const imageId = new ObjectId();

    const { name, description, timeRequired, materials } = ctx.request.body as Partial<UploadDesign>;

    const bucket = DependencyContainer.getInstance().resolve(DependencyToken.Bucket);

    await bucket.addImage(imageId.toString(), file)

    const design: Design = {
        id: new ObjectId().toString(),
        name,
        description,
        timeRequired,
        imageId: imageId.toString(),
        materials: JSON.parse(materials)
    }

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);
    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);

    const updated = await collection.findOneAndUpdate({ _id: new ObjectId(catalogueId) }, { $push: { designs: design } }, { returnDocument: 'after' });

    ctx.status = 200;
    ctx.body = updated.designs;
};
