import { ObjectId } from 'mongodb';

import type { IdGenerator } from '../../domain/IdGenerator';

export class UuidGenerator implements IdGenerator {
    generate(): string {
        return new ObjectId().toString();
    }
}
