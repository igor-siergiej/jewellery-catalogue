// biome-ignore-all lint/correctness/noConstructorReturn: I need to figure out a better way to do this
import { DependencyContainer, Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';

import { config } from '../config';
import { DesignService } from '../domain/DesignService';
import { DesignSuggestionService } from '../domain/DesignSuggestionService';
import { DraftService } from '../domain/DraftService';
import { EtsyClient } from '../domain/EtsyClient';
import { EtsyConnectionService } from '../domain/EtsyConnectionService';
import { EtsyListingCopyService } from '../domain/EtsyListingCopyService';
import { EtsyListingRefreshService } from '../domain/EtsyListingRefreshService';
import { EtsyOAuthStateStore } from '../domain/EtsyOAuthStateStore';
import { EtsyOrderSyncService } from '../domain/EtsyOrderSyncService';
import { EtsyPushService } from '../domain/EtsyPushService';
import { EtsyReconcileService } from '../domain/EtsyReconcileService';
import { EtsyStatusService } from '../domain/EtsyStatusService';
import { GoalService } from '../domain/GoalService';
import { ImageService } from '../domain/ImageService';
import { MaterialService } from '../domain/MaterialService';
import { PriceSuggestionService } from '../domain/PriceSuggestionService';
import { ProductionPlanner } from '../domain/ProductionPlanner';
import { SalesReportService } from '../domain/SalesReportService';
import { TaskService } from '../domain/TaskService';
import { UserSettingsService } from '../domain/UserSettingsService';
import { BucketStore } from '../infrastructure/BucketStore';
import { FalVisionClient } from '../infrastructure/FalVisionClient';
import { MongoDesignRepository } from '../infrastructure/MongoDesignRepository';
import { MongoDraftRepository } from '../infrastructure/MongoDraftRepository';
import { MongoEtsyConnectionRepository } from '../infrastructure/MongoEtsyConnectionRepository';
import { MongoGoalRepository } from '../infrastructure/MongoGoalRepository';
import { MongoMaterialRepository } from '../infrastructure/MongoMaterialRepository';
import { MongoSaleRepository } from '../infrastructure/MongoSaleRepository';
import { MongoTaskRepository } from '../infrastructure/MongoTaskRepository';
import { MongoUserSettingsRepository } from '../infrastructure/MongoUserSettingsRepository';
import { SharpImageResizer } from '../infrastructure/SharpImageResizer';
import { UuidGenerator } from '../infrastructure/UuidGenerator';
import { type Dependencies, DependencyToken } from './types';

export const dependencyContainer = DependencyContainer.getInstance<Dependencies>();

export const registerDepdendencies = () => {
    // Core infrastructure services
    dependencyContainer.registerSingleton(DependencyToken.Database, MongoDbConnection);

    dependencyContainer.registerSingleton(DependencyToken.Logger, Logger);
    dependencyContainer.registerSingleton(DependencyToken.Bucket, ObjectStoreConnection);
    dependencyContainer.registerSingleton(DependencyToken.IdGenerator, UuidGenerator);

    // Infrastructure adapters
    dependencyContainer.registerSingleton(
        DependencyToken.ImageStore,
        class {
            constructor() {
                return new BucketStore(dependencyContainer.resolve(DependencyToken.Bucket));
            }
        } as any
    );

    // Repositories
    dependencyContainer.registerSingleton(
        DependencyToken.DesignRepository,
        class {
            constructor() {
                return new MongoDesignRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.MaterialRepository,
        class {
            constructor() {
                return new MongoMaterialRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    // Domain services
    dependencyContainer.registerSingleton(
        DependencyToken.MaterialService,
        class {
            constructor() {
                return new MaterialService(
                    dependencyContainer.resolve(DependencyToken.MaterialRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.DesignRepository)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.ImageService,
        class {
            constructor() {
                return new ImageService(
                    dependencyContainer.resolve(DependencyToken.ImageStore),
                    undefined,
                    dependencyContainer.resolve(DependencyToken.Logger),
                    new SharpImageResizer()
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DesignService,
        class {
            constructor() {
                return new DesignService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.ImageService),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.MaterialRepository)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DraftRepository,
        class {
            constructor() {
                return new MongoDraftRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DraftService,
        class {
            constructor() {
                return new DraftService(
                    dependencyContainer.resolve(DependencyToken.DraftRepository),
                    dependencyContainer.resolve(DependencyToken.ImageService),
                    dependencyContainer.resolve(DependencyToken.IdGenerator)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.UserSettingsRepository,
        class {
            constructor() {
                return new MongoUserSettingsRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.UserSettingsService,
        class {
            constructor() {
                return new UserSettingsService(
                    dependencyContainer.resolve(DependencyToken.UserSettingsRepository),
                    dependencyContainer.resolve(DependencyToken.DesignRepository)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyConnectionRepository,
        class {
            constructor() {
                return new MongoEtsyConnectionRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.SaleRepository,
        class {
            constructor() {
                return new MongoSaleRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyOrderSyncService,
        class {
            constructor() {
                return new EtsyOrderSyncService(
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionRepository),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionService),
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.SaleRepository),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.SalesReportService,
        class {
            constructor() {
                return new SalesReportService(
                    dependencyContainer.resolve(DependencyToken.SaleRepository),
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.UserSettingsService)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.ProductionPlanner,
        class {
            constructor() {
                return new ProductionPlanner(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.MaterialRepository)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DesignSuggestionService,
        class {
            constructor() {
                return new DesignSuggestionService(
                    dependencyContainer.resolve(DependencyToken.VisionLlm),
                    new SharpImageResizer(),
                    dependencyContainer.resolve(DependencyToken.MaterialRepository),
                    dependencyContainer.resolve(DependencyToken.ImageService),
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.DraftRepository),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.PriceSuggestionService,
        class {
            constructor() {
                return new PriceSuggestionService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.SaleRepository),
                    dependencyContainer.resolve(DependencyToken.UserSettingsService),
                    dependencyContainer.resolve(DependencyToken.VisionLlm)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyListingRefreshService,
        class {
            constructor() {
                return new EtsyListingRefreshService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.EtsyListingCopyService),
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionService)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyClient,
        class {
            constructor() {
                return new EtsyClient(config.get('etsyApiKey'), config.get('etsySharedSecret'));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyOAuthStateStore,
        class {
            constructor() {
                return new EtsyOAuthStateStore();
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyConnectionService,
        class {
            constructor() {
                return new EtsyConnectionService(
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionRepository),
                    dependencyContainer.resolve(DependencyToken.EtsyOAuthStateStore),
                    config.get('etsyRedirectUri')
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyPushService,
        class {
            constructor() {
                return new EtsyPushService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.ImageService),
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionService),
                    dependencyContainer.resolve(DependencyToken.UserSettingsService)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.VisionLlm,
        class {
            constructor() {
                return new FalVisionClient(
                    config.get('falKey') ?? '',
                    dependencyContainer.resolve(DependencyToken.Logger),
                    config.get('falModel') || undefined
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyListingCopyService,
        class {
            constructor() {
                return new EtsyListingCopyService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.ImageService),
                    dependencyContainer.resolve(DependencyToken.VisionLlm),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyStatusService,
        class {
            constructor() {
                return new EtsyStatusService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionService)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyReconcileService,
        class {
            constructor() {
                return new EtsyReconcileService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionService),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.MaterialRepository)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.GoalRepository,
        class {
            constructor() {
                return new MongoGoalRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.TaskRepository,
        class {
            constructor() {
                return new MongoTaskRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.GoalService,
        class {
            constructor() {
                return new GoalService(
                    dependencyContainer.resolve(DependencyToken.GoalRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionRepository)
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.TaskService,
        class {
            constructor() {
                return new TaskService(
                    dependencyContainer.resolve(DependencyToken.TaskRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator)
                );
            }
        } as any
    );
};
