import { Context } from 'koa';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { Catalogue } from '@jewellery-catalogue/types';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { CollectionName } from '../../database/types';
import { ObjectId } from 'mongodb';

export const getCatalogue = async (ctx: Context) => {
    const { id } = ctx.params;

    if (!id) {
        ctx.status = 400;
        ctx.body = { error: 'Catalogue ID is required' };
        return;
    }

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);
    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);
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
