import type { EtsyConnection } from '@jewellery-catalogue/types';

export interface EtsyConnectionRepository {
    getByUserId(userId: string): Promise<EtsyConnection | null>;
    upsert(connection: EtsyConnection): Promise<void>;
    deleteByUserId(userId: string): Promise<void>;
    getAll(): Promise<EtsyConnection[]>;
    setOrdersSyncedThrough(userId: string, epochSeconds: number): Promise<void>;
    markBroken(userId: string): Promise<void>;
}
