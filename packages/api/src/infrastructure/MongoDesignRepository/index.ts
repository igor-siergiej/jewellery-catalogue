import type { MongoDbConnection } from '@imapps/api-utils';
import type { Design } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { ApplyEtsySaleArgs, ApplyEtsySaleResult, DesignRepository } from '../../domain/DesignRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoDesignRepository extends MongoRepository<Design> implements DesignRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Designs);
    }

    protected usesObjectId(): boolean {
        return false;
    }

    private migrate(doc: any): Design {
        if (!doc.imageIds && doc.imageId) {
            doc.imageIds = [doc.imageId];
            delete doc.imageId;
        }
        return doc as Design;
    }

    async getByUserId(userId: string): Promise<Array<Design>> {
        const docs = await this.collection()
            .find({ userId }, { projection: { _id: 0 } })
            .toArray();
        return docs.map((d) => this.migrate(d));
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Design | null> {
        const doc = await this.collection().findOne({ id, userId }, { projection: { _id: 0 } });
        return doc ? this.migrate(doc) : null;
    }

    async findByMaterialId(materialId: string): Promise<Array<Design>> {
        const docs = await this.collection()
            .find(
                {
                    $or: [{ 'materials.id': materialId }, { 'variationGroups.options.material.id': materialId }],
                },
                { projection: { _id: 0 } }
            )
            .toArray();
        return docs.map((d) => this.migrate(d));
    }

    async applyEtsySale(args: ApplyEtsySaleArgs): Promise<ApplyEtsySaleResult> {
        const { designId, userId, variantId, transactionId, quantity } = args;
        const decrement = (field: string) => ({ $max: [0, { $subtract: [{ $ifNull: [field, 0] }, quantity] }] });
        const recordSale = {
            etsySaleIds: { $concatArrays: [{ $ifNull: ['$etsySaleIds', []] }, [transactionId]] },
        };

        // One single-document update both deducts stock and records the transaction id, so a
        // retry after a crash can never deduct the same sale twice.
        const pipeline = variantId
            ? [
                  {
                      $set: {
                          ...recordSale,
                          variants: {
                              $map: {
                                  input: '$variants',
                                  as: 'v',
                                  in: {
                                      $cond: [
                                          { $eq: ['$$v.id', variantId] },
                                          { $mergeObjects: ['$$v', { totalQuantity: decrement('$$v.totalQuantity') }] },
                                          '$$v',
                                      ],
                                  },
                              },
                          },
                      },
                  },
                  { $set: { totalQuantity: { $sum: '$variants.totalQuantity' } } },
              ]
            : [{ $set: { ...recordSale, totalQuantity: decrement('$totalQuantity') } }];

        const result = await this.collection().updateOne(
            { id: designId, userId, etsySaleIds: { $ne: transactionId } },
            pipeline
        );
        if (result.matchedCount === 1) return 'applied';

        const exists = await this.collection().findOne({ id: designId, userId }, { projection: { _id: 1 } });
        return exists ? 'already_applied' : 'design_not_found';
    }

    async imageBelongsToUser(imageId: string, userId: string): Promise<boolean> {
        const doc = await this.collection().findOne(
            {
                userId,
                $or: [{ imageIds: imageId }, { diagramImageIds: imageId }, { imageId }],
            },
            { projection: { _id: 1 } }
        );
        return doc !== null;
    }
}
