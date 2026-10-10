import type { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';
import type {
    Design,
    Draft,
    EtsyConnection,
    Goal,
    Material,
    Sale,
    Task,
    UserSettings,
} from '@jewellery-catalogue/types';

import type { DesignRepository } from '../domain/DesignRepository';
import type { DesignService } from '../domain/DesignService';
import type { DesignSuggestionService } from '../domain/DesignSuggestionService';
import type { DraftRepository } from '../domain/DraftRepository';
import type { DraftService } from '../domain/DraftService';
import type { EtsyClient } from '../domain/EtsyClient';
import type { EtsyConnectionRepository } from '../domain/EtsyConnectionRepository';
import type { EtsyConnectionService } from '../domain/EtsyConnectionService';
import type { EtsyListingCopyService } from '../domain/EtsyListingCopyService';
import type { VisionLlm } from '../domain/EtsyListingCopyService/types';
import type { EtsyOAuthStateStore } from '../domain/EtsyOAuthStateStore';
import type { EtsyOrderSyncService } from '../domain/EtsyOrderSyncService';
import type { EtsyPushService } from '../domain/EtsyPushService';
import type { EtsyReconcileService } from '../domain/EtsyReconcileService';
import type { EtsyStatusService } from '../domain/EtsyStatusService';
import type { GoalRepository } from '../domain/GoalRepository';
import type { GoalService } from '../domain/GoalService';
import type { IdGenerator } from '../domain/IdGenerator';
import type { ImageService } from '../domain/ImageService';
import type { ImageStore } from '../domain/ImageService/types';
import type { MaterialRepository } from '../domain/MaterialRepository';
import type { MaterialService } from '../domain/MaterialService';
import type { PriceSuggestionService } from '../domain/PriceSuggestionService';
import type { ProductionPlanner } from '../domain/ProductionPlanner';
import type { SaleRepository } from '../domain/SaleRepository';
import type { SalesReportService } from '../domain/SalesReportService';
import type { TaskRepository } from '../domain/TaskRepository';
import type { TaskService } from '../domain/TaskService';
import type { UserSettingsRepository } from '../domain/UserSettingsRepository';
import type { UserSettingsService } from '../domain/UserSettingsService';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.Designs]: Design;
    [CollectionNames.Materials]: Material;
    [CollectionNames.Drafts]: Draft;
    [CollectionNames.UserSettings]: UserSettings;
    [CollectionNames.EtsyConnections]: EtsyConnection;
    [CollectionNames.Goals]: Goal;
    [CollectionNames.Tasks]: Task;
    [CollectionNames.Sales]: Sale;
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
    GoalRepository = 'GoalRepository',
    TaskRepository = 'TaskRepository',
    SaleRepository = 'SaleRepository',
    // Services
    DesignService = 'DesignService',
    MaterialService = 'MaterialService',
    ImageService = 'ImageService',
    DraftService = 'DraftService',
    UserSettingsService = 'UserSettingsService',
    GoalService = 'GoalService',
    TaskService = 'TaskService',
    EtsyConnectionService = 'EtsyConnectionService',
    EtsyPushService = 'EtsyPushService',
    EtsyStatusService = 'EtsyStatusService',
    EtsyReconcileService = 'EtsyReconcileService',
    EtsyListingCopyService = 'EtsyListingCopyService',
    EtsyOrderSyncService = 'EtsyOrderSyncService',
    SalesReportService = 'SalesReportService',
    ProductionPlanner = 'ProductionPlanner',
    DesignSuggestionService = 'DesignSuggestionService',
    PriceSuggestionService = 'PriceSuggestionService',
    // Infrastructure
    IdGenerator = 'IdGenerator',
    ImageStore = 'ImageStore',
    EtsyClient = 'EtsyClient',
    EtsyOAuthStateStore = 'EtsyOAuthStateStore',
    VisionLlm = 'VisionLlm',
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
    [DependencyToken.GoalRepository]: GoalRepository;
    [DependencyToken.TaskRepository]: TaskRepository;
    [DependencyToken.SaleRepository]: SaleRepository;
    // Services
    [DependencyToken.DesignService]: DesignService;
    [DependencyToken.MaterialService]: MaterialService;
    [DependencyToken.ImageService]: ImageService;
    [DependencyToken.DraftService]: DraftService;
    [DependencyToken.UserSettingsService]: UserSettingsService;
    [DependencyToken.GoalService]: GoalService;
    [DependencyToken.TaskService]: TaskService;
    [DependencyToken.EtsyConnectionService]: EtsyConnectionService;
    [DependencyToken.EtsyPushService]: EtsyPushService;
    [DependencyToken.EtsyStatusService]: EtsyStatusService;
    [DependencyToken.EtsyReconcileService]: EtsyReconcileService;
    [DependencyToken.EtsyListingCopyService]: EtsyListingCopyService;
    [DependencyToken.EtsyOrderSyncService]: EtsyOrderSyncService;
    [DependencyToken.SalesReportService]: SalesReportService;
    [DependencyToken.ProductionPlanner]: ProductionPlanner;
    [DependencyToken.DesignSuggestionService]: DesignSuggestionService;
    [DependencyToken.PriceSuggestionService]: PriceSuggestionService;
    // Infrastructure
    [DependencyToken.IdGenerator]: IdGenerator;
    [DependencyToken.ImageStore]: ImageStore;
    [DependencyToken.EtsyClient]: EtsyClient;
    [DependencyToken.EtsyOAuthStateStore]: EtsyOAuthStateStore;
    [DependencyToken.VisionLlm]: VisionLlm;
};

export enum CollectionNames {
    Designs = 'designs',
    Materials = 'materials',
    Drafts = 'drafts',
    UserSettings = 'userSettings',
    EtsyConnections = 'etsyConnections',
    Goals = 'goals',
    Tasks = 'tasks',
    Sales = 'sales',
}
