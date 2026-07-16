import type { ImportRun } from '@jewellery-catalogue/types';

export interface ImportRunRepository {
    getByUserId(userId: string): Promise<Array<ImportRun>>;
    getByIdAndUserId(id: string, userId: string): Promise<ImportRun | null>;
    getById(id: string): Promise<ImportRun | null>;
    findRunning(userId: string): Promise<ImportRun | null>;
    insert(run: ImportRun): Promise<void>;
    update(id: string, run: ImportRun): Promise<void>;
    requestCancel(id: string): Promise<void>;
}
