import { Catalogue } from '@jewellery-catalogue/types';
import { Context } from 'koa';
import { ObjectId } from 'mongodb';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

export const addCatalogue = async (ctx: Context) => {
    const { id } = ctx.request.body as { id: string };

    if (!id) {
        ctx.status = 400;
        ctx.body = { error: 'ID is required in request body' };
        return;
    }

    const database = dependencyContainer.resolve(DependencyToken.Database);
    const collection = database.getCollection(CollectionNames.Catalogues);

    // Check if catalogue with this ID already exists
    const existingCatalogue = await collection.findOne({ _id: new ObjectId(id) });
    if (existingCatalogue) {
        ctx.status = 409;
        ctx.body = { error: 'Catalogue with this ID already exists' };
        return;
    }

    // Create new catalogue
    const newCatalogue: Catalogue = {
        _id: new ObjectId(id),
        designs: [],
        materials: []
    };

    const result = await collection.insertOne(newCatalogue);

    ctx.status = 201;
    ctx.body = {
        id: result.insertedId,
        designs: newCatalogue.designs,
        materials: newCatalogue.materials
    };
};
