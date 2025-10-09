// biome-ignore-all lint/correctness/noConstructorReturn: I need to figure out a better way to do this
import { DependencyContainer, Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';

import { DesignService } from '../domain/DesignService';
import { ImageService } from '../domain/ImageService';
import { MaterialService } from '../domain/MaterialService';
import { BucketStore } from '../infrastructure/BucketStore';
import { MongoDesignRepository } from '../infrastructure/MongoDesignRepository';
import { MongoMaterialRepository } from '../infrastructure/MongoMaterialRepository';
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
                    dependencyContainer.resolve(DependencyToken.IdGenerator)
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
                    dependencyContainer.resolve(DependencyToken.IdGenerator)
                );
            }
        } as any
    );
};
