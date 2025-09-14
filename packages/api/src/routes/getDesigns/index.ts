import { Context } from 'koa';
import { ObjectId } from 'mongodb';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

export const getDesigns = async (ctx: Context) => {
    const { catalogueId } = ctx.params;

    if (!catalogueId) {
        ctx.status = 400;
        ctx.body = { error: 'Catalogue ID is required' };
        return;
    }

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database connection failed' };
        return;
    }

    const collection = database.getCollection(CollectionNames.Catalogues);

    const catalogue = await collection.findOne({ _id: new ObjectId(catalogueId) });

    if (!catalogue) {
        ctx.status = 404;
        ctx.body = { error: 'Catalogue not found' };
        return;
    }

    ctx.status = 200;
    ctx.body = catalogue.designs;
};
