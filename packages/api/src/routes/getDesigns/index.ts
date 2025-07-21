import { Catalogue } from '@jewellery-catalogue/types';
import { Context } from 'koa';
import { ObjectId } from 'mongodb';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

export const getDesigns = async (ctx: Context) => {
    const { catalogueId } = ctx.params;

    if (!catalogueId) {
        ctx.status = 400;
        ctx.body = { error: 'Catalogue ID is required' };
        return;
    }

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database connection failed' };
        return;
    }

    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);

    const catalogue = await collection.findOne({ _id: new ObjectId(catalogueId) });

    if (!catalogue) {
        ctx.status = 404;
        ctx.body = { error: 'Catalogue not found' };
        return;
    }

    ctx.status = 200;
    ctx.body = catalogue.designs;
};
