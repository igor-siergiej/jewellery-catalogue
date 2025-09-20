import { ObjectId } from 'mongodb';

import { IdGenerator } from '../../domain/IdGenerator';

export class UuidGenerator implements IdGenerator {
    generate(): string {
        return new ObjectId().toString();
    }
}
