import { Context } from 'koa';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { CollectionName } from '../../database/types';
import { ObjectId } from 'mongodb';
import { Catalogue, FormMaterial, FormMaterialKeysMap, Material, MaterialType } from '@jewellery-catalogue/types';
import { convertFormDataToMaterial } from './util';

export const addMaterial = async (ctx: Context) => {
    const { catalogueId } = ctx.params;
    const materialData = ctx.request.body as FormMaterial;

    if (!catalogueId) {
        ctx.status = 400;
        ctx.body = { error: 'Catalogue ID is required' };
        return;
    }

    const logger = DependencyContainer.getInstance().resolve(DependencyToken.Logger);

    if (!logger) {
        throw new Error('Logger dependency not resolved');
    }

    const material = getMaterial(materialData);

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database not available' };
        return;
    }

    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);
    const updated = await collection.findOneAndUpdate({ _id: new ObjectId(catalogueId) }, { $push: { materials: material } }, { returnDocument: 'after' });

    if (!updated) {
        ctx.status = 404;
        ctx.body = { error: 'Catalogue not found' };
        return;
    }

    ctx.status = 200;
    ctx.body = updated.materials;
};

// TODO: maybe abstract this out into a validation function or something
const getMaterial = (material: FormMaterial): Material => {
    const materialType = material?.type;

    if (!(materialType in MaterialType)) {
        throw new Error(`Unknown material type: ${materialType}`);
    }

    const expectedKeys = Object.keys(FormMaterialKeysMap[materialType]);
    const missingKeys = expectedKeys.filter(key => !(key in material));

    if (missingKeys.length > 0) {
        throw new Error(`Material of type '${materialType}' is missing the following keys: ${missingKeys.join(', ')}`);
    }

    const filteredMaterial = Object.keys(material)
        .filter(key => expectedKeys.includes(key))
        .reduce((obj, key) => {
            obj[key] = material[key];
            return obj;
        }, {} as FormMaterial);

    return {
        id: new ObjectId().toString(),
        ...convertFormDataToMaterial(filteredMaterial),
    };
};
