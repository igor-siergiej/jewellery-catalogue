import { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';
import { Design, Material } from '@jewellery-catalogue/types';

import { DesignRepository } from '../domain/DesignRepository';
import { DesignService } from '../domain/DesignService';
import { IdGenerator } from '../domain/IdGenerator';
import { ImageService } from '../domain/ImageService';
import { ImageStore } from '../domain/ImageService/types';
import { MaterialRepository } from '../domain/MaterialRepository';
import { MaterialService } from '../domain/MaterialService';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.Designs]: Design;
    [CollectionNames.Materials]: Material;
};

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger',
    Bucket = 'Bucket',
    // Repositories
    DesignRepository = 'DesignRepository',
    MaterialRepository = 'MaterialRepository',
    // Services
    DesignService = 'DesignService',
    MaterialService = 'MaterialService',
    ImageService = 'ImageService',
    // Infrastructure
    IdGenerator = 'IdGenerator',
    ImageStore = 'ImageStore'
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Dependencies = {
    [DependencyToken.Database]: MongoDbConnection<Collections>;
    [DependencyToken.Logger]: Logger;
    [DependencyToken.Bucket]: ObjectStoreConnection;
    // Repositories
    [DependencyToken.DesignRepository]: DesignRepository;
    [DependencyToken.MaterialRepository]: MaterialRepository;
    // Services
    [DependencyToken.DesignService]: DesignService;
    [DependencyToken.MaterialService]: MaterialService;
    [DependencyToken.ImageService]: ImageService;
    // Infrastructure
    [DependencyToken.IdGenerator]: IdGenerator;
    [DependencyToken.ImageStore]: ImageStore;
};

export enum CollectionNames {
    Designs = 'designs',
    Materials = 'materials'
}
