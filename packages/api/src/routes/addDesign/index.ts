import { Design, PersistentFile, UploadDesign } from '@jewellery-catalogue/types';
import fs from 'fs';
import { Context } from 'koa';
import { ObjectId } from 'mongodb';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

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

    const bucket = dependencyContainer.resolve(DependencyToken.Bucket);

    // Read the file from filesystem and convert to Buffer
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to bucket with proper metadata
    await bucket.putObject(imageId.toString(), fileBuffer, {
        contentType: file.mimetype || 'application/octet-stream'
    });

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

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database connection failed' };
        return;
    }

    const collection = database.getCollection(CollectionNames.Catalogues);

    const updated = await collection.findOneAndUpdate({ _id: new ObjectId(catalogueId) }, { $push: { designs: design } }, { returnDocument: 'after' });

    if (!updated) {
        ctx.status = 404;
        ctx.body = { error: 'Catalogue not found' };
        return;
    }

    ctx.status = 200;
    ctx.body = updated.designs;
};
