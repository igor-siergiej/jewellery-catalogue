import { Context } from 'koa';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { CollectionName } from '../../database/types';
import { ObjectId } from 'mongodb';
import { catalogueId } from '..';
import { Catalogue, FormMaterial, FormMaterialKeysMap, Material, MaterialType } from '@jewellery-catalogue/types';
import { convertFormDataToMaterial } from './util';

export const addMaterial = async (ctx: Context) => {
    const material = getMaterial(ctx.request.body as FormMaterial);

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);
    const collection = database.getCollection<Catalogue>(CollectionName.Catalogues);
    const updated = await collection.findOneAndUpdate({ _id: new ObjectId(catalogueId) }, { $push: { materials: material } }, { returnDocument: 'after' });

    ctx.status = 200;
    ctx.body = updated.materials;
};

// TODO: maybe abstract this out into a validation function or something
const getMaterial = (material: FormMaterial): Material | null => {
    const materialType = material?.type;

    if (!(materialType in MaterialType)) {
        throw new Error(`Unknown material type: ${materialType}`);
    }

    const missingKeys = Object.keys(FormMaterialKeysMap[materialType]).filter((key: keyof Material) => !(key in material));

    if (missingKeys.length > 0) {
        throw new Error(`Material of type '${materialType}' is missing the following keys: ${missingKeys.join(', ')}`);
    }

    const additionalKeys = Object.keys(material).filter((key: keyof Material) => !(key in FormMaterialKeysMap[materialType]));

    if (additionalKeys.length > 0) {
        throw new Error(`Unexpected additional keys: ${additionalKeys.join(', ')}`);
    }

    return {
        id: new ObjectId().toString(),
        ...convertFormDataToMaterial(material),
    };
};
