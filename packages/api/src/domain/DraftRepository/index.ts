import type { Draft } from '@jewellery-catalogue/types';

export interface DraftRepository {
    getByUserId(userId: string): Promise<Array<Draft>>;
    getByIdAndUserId(id: string, userId: string): Promise<Draft | null>;
    insert(draft: Draft): Promise<void>;
    update(id: string, draft: Draft): Promise<void>;
    delete(id: string): Promise<void>;
}
