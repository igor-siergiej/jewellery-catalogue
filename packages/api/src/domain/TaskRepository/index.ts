import type { Task } from '@jewellery-catalogue/types';

import type { BaseRepository } from '../BaseRepository';

export interface TaskRepository extends BaseRepository<Task> {
    getByUserId(userId: string): Promise<Array<Task>>;
    getByIdAndUserId(id: string, userId: string): Promise<Task | null>;
    /**
     * Deletes every `done` task, across all users, completed before `cutoff`. A done task without
     * `completedAt` (completed before the field existed) is judged by `updatedAt` instead.
     * Returns the number of tasks deleted.
     */
    deleteCompletedBefore(cutoff: Date): Promise<number>;
}
