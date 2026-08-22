import type { Task } from '@jewellery-catalogue/types';

import type { BaseRepository } from '../BaseRepository';

export interface TaskRepository extends BaseRepository<Task> {
    getByUserId(userId: string): Promise<Array<Task>>;
    getByIdAndUserId(id: string, userId: string): Promise<Task | null>;
}
