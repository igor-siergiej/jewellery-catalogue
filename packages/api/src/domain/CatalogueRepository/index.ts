import { Catalogue } from '@jewellery-catalogue/types';

import { BaseRepository } from '../BaseRepository';

// CatalogueRepository uses all base operations without additional methods
export type CatalogueRepository = BaseRepository<Catalogue>;
