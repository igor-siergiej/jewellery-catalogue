import { Context } from 'koa';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { CollectionName } from '../../database/types';
import { ObjectId } from 'mongodb';
import { catalogueId } from '..';
import { Catalogue, Design } from '@jewellery-catalogue/types';

export const addDesign = async (ctx: Context) => {
    const design = ctx.request.body as Design;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);
    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);
    const updated = await collection.findOneAndUpdate({ _id: new ObjectId(catalogueId) }, { $push: { designs: design } }, { returnDocument: 'after' });

    ctx.status = 200;
    ctx.body = updated.materials;
};
