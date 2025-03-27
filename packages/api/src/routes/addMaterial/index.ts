import { Context } from 'koa';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { CollectionName } from '../../database/types';
import { ObjectId } from 'mongodb';
import { catalogueId } from '..';
import { Catalogue, Material, MaterialKeysMap, MaterialType } from 'types';

export const addMaterial = async (ctx: Context) => {
    const material = getMaterial(ctx.request.body as Material);

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);
    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);
    const updated = await collection.findOneAndUpdate({ _id: new ObjectId(catalogueId) }, { $push: { materials: material } }, { returnDocument: 'after' });

    ctx.status = 200;
    ctx.body = updated.materials;
};

const getMaterial = (material: Material): Material | null => {
    const materialType = material?.type;

    if (!(materialType in MaterialType)) {
        throw new Error(`Unknown material type: ${materialType}`);
    }

    const missingKeys = Object.keys(MaterialKeysMap[materialType]).filter((key: keyof Material) => !(key in material));

    if (missingKeys.length > 0) {
        throw new Error(`Material of type '${materialType}' is missing the following keys: ${missingKeys.join(', ')}`);
    }

    const additionalKeys = Object.keys(material).filter((key: keyof Material) => !(key in MaterialKeysMap[materialType]));

    if (additionalKeys.length > 0) {
        throw new Error(`Unexpected additional keys: ${additionalKeys.join(', ')}`);
    }

    return {
        ...material,
        _id: new ObjectId()
    };
};
