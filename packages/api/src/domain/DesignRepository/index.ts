import type { Design } from '@jewellery-catalogue/types';

import type { BaseRepository } from '../BaseRepository';

export interface DesignRepository extends BaseRepository<Design> {
    getByUserId(userId: string): Promise<Array<Design>>;
    getByIdAndUserId(id: string, userId: string): Promise<Design | null>;
    findByMaterialId(materialId: string): Promise<Array<Design>>;
}
