import { Context } from 'koa';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { Catalogue } from '@jewellery-catalogue/types';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { CollectionName } from '../../database/types';
import { ObjectId } from 'mongodb';
import { catalogueId } from '..';

export const getCatalogue = async (ctx: Context) => {
    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);
    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);
    const catalogue = await collection.findOne({ _id: new ObjectId(catalogueId) });

    ctx.body = {
        id: catalogue._id,
        designs: catalogue.designs,
        materials: catalogue.materials
    };
};
