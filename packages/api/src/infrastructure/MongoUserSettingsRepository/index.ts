import type { MongoDbConnection } from '@imapps/api-utils';
import type { UserSettings } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { UserSettingsRepository } from '../../domain/UserSettingsRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoUserSettingsRepository extends MongoRepository<UserSettings> implements UserSettingsRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.UserSettings);
    }

    async getByUserId(userId: string): Promise<UserSettings | null> {
        return this.collection().findOne({ userId }, { projection: { _id: 0 } });
    }

    async upsert(settings: UserSettings): Promise<void> {
        await this.collection().findOneAndReplace({ userId: settings.userId }, settings, {
            upsert: true,
        });
    }
}
