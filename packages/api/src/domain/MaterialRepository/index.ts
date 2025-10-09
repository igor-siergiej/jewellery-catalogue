import { Material } from '@jewellery-catalogue/types';

import { BaseRepository } from '../BaseRepository';

export interface MaterialRepository extends BaseRepository<Material> {
    getByUserId(userId: string): Promise<Array<Material>>;
    getByIdAndUserId(id: string, userId: string): Promise<Material | null>;
}
