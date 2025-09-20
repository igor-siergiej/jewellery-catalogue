import { Design } from '@jewellery-catalogue/types';

import { BaseRepository } from '../BaseRepository';

export interface DesignRepository extends BaseRepository<Design> {
    getByCatalogueId(catalogueId: string): Promise<Array<Design>>;
}
