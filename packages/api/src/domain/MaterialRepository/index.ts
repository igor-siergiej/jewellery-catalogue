import { Material } from '@jewellery-catalogue/types';

import { BaseRepository } from '../BaseRepository';

export interface MaterialRepository extends BaseRepository<Material> {
    getByCatalogueId(catalogueId: string): Promise<Array<Material>>;
}
