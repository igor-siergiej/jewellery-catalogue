import type { Goal } from '@jewellery-catalogue/types';

import type { BaseRepository } from '../BaseRepository';

export interface GoalRepository extends BaseRepository<Goal> {
    getByUserId(userId: string): Promise<Array<Goal>>;
    getByIdAndUserId(id: string, userId: string): Promise<Goal | null>;
}
