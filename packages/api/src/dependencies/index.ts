// biome-ignore-all lint/correctness/noConstructorReturn: I need to figure out a better way to do this
import { DependencyContainer, Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';

import { config } from '../config';
import { DesignService } from '../domain/DesignService';
import { DraftService } from '../domain/DraftService';
import { EtsyClient } from '../domain/EtsyClient';
import { EtsyConnectionService } from '../domain/EtsyConnectionService';
import { EtsyOAuthStateStore } from '../domain/EtsyOAuthStateStore';
import { EtsyPushService } from '../domain/EtsyPushService';
import { EtsyReconcileService } from '../domain/EtsyReconcileService';
import { EtsyStatusService } from '../domain/EtsyStatusService';
import { ImageService } from '../domain/ImageService';
import { MaterialService } from '../domain/MaterialService';
import { UserSettingsService } from '../domain/UserSettingsService';
import { BucketStore } from '../infrastructure/BucketStore';
import { MongoDesignRepository } from '../infrastructure/MongoDesignRepository';
import { MongoDraftRepository } from '../infrastructure/MongoDraftRepository';
import { MongoEtsyConnectionRepository } from '../infrastructure/MongoEtsyConnectionRepository';
import { MongoMaterialRepository } from '../infrastructure/MongoMaterialRepository';
import { MongoUserSettingsRepository } from '../infrastructure/MongoUserSettingsRepository';
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
                    dependencyContainer.resolve(DependencyToken.Logger)
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
};
