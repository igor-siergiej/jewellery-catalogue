import { Catalogue } from '@jewellery-catalogue/types';
import { Context } from 'koa';
import { ObjectId } from 'mongodb';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

export const getCatalogue = async (ctx: Context) => {
    const { id } = ctx.params;

    if (!id) {
        ctx.status = 400;
        ctx.body = { error: 'Catalogue ID is required' };
        return;
    }

    const database = dependencyContainer.resolve(DependencyToken.Database);
    const collection = database.getCollection(CollectionNames.Catalogues);
    const catalogue = await collection.findOne({ _id: new ObjectId(id) });

    if (!catalogue) {
        ctx.status = 404;
        ctx.body = { error: 'Catalogue not found' };
        return;
    }

    ctx.body = {
        id: catalogue._id,
        designs: catalogue.designs,
        materials: catalogue.materials
    };
};
