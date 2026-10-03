import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import type { MongoDbConnection } from '@imapps/api-utils';

import '../../test-setup';
import { CollectionNames, type Collections } from '../../dependencies/types';
import { MongoDraftRepository } from './index';

const mockDraftsCollection = {
    findOne: mock(),
    find: mock(),
    insertOne: mock(),
    findOneAndReplace: mock(),
    deleteOne: mock(),
};

const mockDb = {
    getCollection: mock().mockReturnValue(mockDraftsCollection),
} as unknown as MongoDbConnection<Collections>;

describe('MongoDraftRepository', () => {
    let repository: MongoDraftRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new MongoDraftRepository(mockDb);
    });

    describe('constructor', () => {
        it('initializes with the Drafts collection', () => {
            expect(repository.collectionName).toBe(CollectionNames.Drafts);
        });
    });

    describe('imageBelongsToUser', () => {
        it('returns true when a draft with the imageId is owned by the user', async () => {
            mockDraftsCollection.findOne.mockResolvedValue({ _id: 'doc-id' });

            const result = await repository.imageBelongsToUser('image-1', 'user-1');

            expect(mockDraftsCollection.findOne).toHaveBeenCalledWith(
                { userId: 'user-1', imageId: 'image-1' },
                { projection: { _id: 1 } }
            );
            expect(result).toBe(true);
        });

        it('returns false when no draft contains the imageId for the user', async () => {
            mockDraftsCollection.findOne.mockResolvedValue(null);

            const result = await repository.imageBelongsToUser('image-missing', 'user-1');
            expect(result).toBe(false);
        });
    });
});
