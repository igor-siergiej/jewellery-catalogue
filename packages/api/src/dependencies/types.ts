import type { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';
import type { Design, Draft, EtsyConnection, Material, UserSettings } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../domain/DesignRepository';
import type { DesignService } from '../domain/DesignService';
import type { DraftRepository } from '../domain/DraftRepository';
import type { DraftService } from '../domain/DraftService';
import type { EtsyClient } from '../domain/EtsyClient';
import type { EtsyConnectionRepository } from '../domain/EtsyConnectionRepository';
import type { EtsyConnectionService } from '../domain/EtsyConnectionService';
import type { EtsyOAuthStateStore } from '../domain/EtsyOAuthStateStore';
import type { IdGenerator } from '../domain/IdGenerator';
import type { ImageService } from '../domain/ImageService';
import type { ImageStore } from '../domain/ImageService/types';
import type { MaterialRepository } from '../domain/MaterialRepository';
import type { MaterialService } from '../domain/MaterialService';
import type { UserSettingsRepository } from '../domain/UserSettingsRepository';
import type { UserSettingsService } from '../domain/UserSettingsService';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.Designs]: Design;
    [CollectionNames.Materials]: Material;
    [CollectionNames.Drafts]: Draft;
    [CollectionNames.UserSettings]: UserSettings;
    [CollectionNames.EtsyConnections]: EtsyConnection;
};

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger',
    Bucket = 'Bucket',
    // Repositories
    DesignRepository = 'DesignRepository',
    MaterialRepository = 'MaterialRepository',
    DraftRepository = 'DraftRepository',
    UserSettingsRepository = 'UserSettingsRepository',
    EtsyConnectionRepository = 'EtsyConnectionRepository',
    // Services
    DesignService = 'DesignService',
    MaterialService = 'MaterialService',
    ImageService = 'ImageService',
    DraftService = 'DraftService',
    UserSettingsService = 'UserSettingsService',
    EtsyConnectionService = 'EtsyConnectionService',
    // Infrastructure
    IdGenerator = 'IdGenerator',
    ImageStore = 'ImageStore',
    EtsyClient = 'EtsyClient',
    EtsyOAuthStateStore = 'EtsyOAuthStateStore',
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Dependencies = {
    [DependencyToken.Database]: MongoDbConnection<Collections>;
    [DependencyToken.Logger]: Logger;
    [DependencyToken.Bucket]: ObjectStoreConnection;
    // Repositories
    [DependencyToken.DesignRepository]: DesignRepository;
    [DependencyToken.MaterialRepository]: MaterialRepository;
    [DependencyToken.DraftRepository]: DraftRepository;
    [DependencyToken.UserSettingsRepository]: UserSettingsRepository;
    [DependencyToken.EtsyConnectionRepository]: EtsyConnectionRepository;
    // Services
    [DependencyToken.DesignService]: DesignService;
    [DependencyToken.MaterialService]: MaterialService;
    [DependencyToken.ImageService]: ImageService;
    [DependencyToken.DraftService]: DraftService;
    [DependencyToken.UserSettingsService]: UserSettingsService;
    [DependencyToken.EtsyConnectionService]: EtsyConnectionService;
    // Infrastructure
    [DependencyToken.IdGenerator]: IdGenerator;
    [DependencyToken.ImageStore]: ImageStore;
    [DependencyToken.EtsyClient]: EtsyClient;
    [DependencyToken.EtsyOAuthStateStore]: EtsyOAuthStateStore;
};

export enum CollectionNames {
    Designs = 'designs',
    Materials = 'materials',
    Drafts = 'drafts',
    UserSettings = 'userSettings',
    EtsyConnections = 'etsyConnections',
}
