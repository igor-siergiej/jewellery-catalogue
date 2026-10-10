import type { AiUsageRecord } from '@jewellery-catalogue/types';

export interface AiUsageRepository {
    record(entry: AiUsageRecord): Promise<void>;
    countSince(userId: string, since: Date): Promise<number>;
}
