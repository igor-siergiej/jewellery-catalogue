import { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DesignService } from '../domain/DesignService';
import { ImageService } from '../domain/ImageService';
import { MaterialService } from '../domain/MaterialService';
import { BucketStore } from '../infrastructure/BucketStore';
import { MongoDesignRepository } from '../infrastructure/MongoDesignRepository';
import { MongoMaterialRepository } from '../infrastructure/MongoMaterialRepository';
import { UuidGenerator } from '../infrastructure/UuidGenerator';
import { dependencyContainer, registerDepdendencies } from './index';
import { DependencyToken } from './types';

const mockDependencyContainer = vi.hoisted(() => ({
    registerSingleton: vi.fn(),
    resolve: vi.fn(),
}));

// Mock all the dependencies
vi.mock('@imapps/api-utils', () => ({
    DependencyContainer: {
        getInstance: vi.fn(() => mockDependencyContainer),
    },
    Logger: vi.fn(),
    MongoDbConnection: vi.fn(),
    ObjectStoreConnection: vi.fn(),
}));

vi.mock('../domain/DesignService', () => ({
    DesignService: vi.fn(),
}));

vi.mock('../domain/ImageService', () => ({
    ImageService: vi.fn(),
}));

vi.mock('../domain/MaterialService', () => ({
    MaterialService: vi.fn(),
}));

vi.mock('../infrastructure/BucketStore', () => ({
    BucketStore: vi.fn(),
}));

vi.mock('../infrastructure/MongoDesignRepository', () => ({
    MongoDesignRepository: vi.fn(),
}));

vi.mock('../infrastructure/MongoMaterialRepository', () => ({
    MongoMaterialRepository: vi.fn(),
}));

vi.mock('../infrastructure/UuidGenerator', () => ({
    UuidGenerator: vi.fn(),
}));

describe('Dependencies', () => {
    describe('dependencyContainer', () => {
        it('should be the mocked dependency container instance', () => {
            expect(dependencyContainer).toBe(mockDependencyContainer);
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('registerDepdendencies', () => {
        beforeEach(() => {
            registerDepdendencies();
        });

        describe('core infrastructure services', () => {
            it('should register Database as singleton', () => {
                expect(mockDependencyContainer.registerSingleton).toHaveBeenCalledWith(
                    DependencyToken.Database,
                    MongoDbConnection
                );
            });

            it('should register Logger as singleton', () => {
                expect(mockDependencyContainer.registerSingleton).toHaveBeenCalledWith(DependencyToken.Logger, Logger);
            });

            it('should register Bucket as singleton', () => {
                expect(mockDependencyContainer.registerSingleton).toHaveBeenCalledWith(
                    DependencyToken.Bucket,
                    ObjectStoreConnection
                );
            });

            it('should register IdGenerator as singleton', () => {
                expect(mockDependencyContainer.registerSingleton).toHaveBeenCalledWith(
                    DependencyToken.IdGenerator,
                    UuidGenerator
                );
            });
        });

        describe('infrastructure adapters', () => {
            it('should register ImageStore with BucketStore factory', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;
                const imageStoreCall = calls.find((call) => call[0] === DependencyToken.ImageStore);

                expect(imageStoreCall).toBeDefined();
                expect(imageStoreCall[0]).toBe(DependencyToken.ImageStore);

                // Test the factory function by creating an instance
                const FactoryClass = imageStoreCall[1];
                const _instance = new FactoryClass();

                expect(BucketStore).toHaveBeenCalledWith(undefined); // resolve returns undefined in mock
            });
        });

        describe('repositories', () => {
            it('should register DesignRepository with MongoDesignRepository factory', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;
                const designRepoCall = calls.find((call) => call[0] === DependencyToken.DesignRepository);

                expect(designRepoCall).toBeDefined();
                expect(designRepoCall[0]).toBe(DependencyToken.DesignRepository);

                // Test the factory function
                const FactoryClass = designRepoCall[1];
                const _instance = new FactoryClass();

                expect(MongoDesignRepository).toHaveBeenCalledWith(undefined);
            });

            it('should register MaterialRepository with MongoMaterialRepository factory', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;
                const materialRepoCall = calls.find((call) => call[0] === DependencyToken.MaterialRepository);

                expect(materialRepoCall).toBeDefined();
                expect(materialRepoCall[0]).toBe(DependencyToken.MaterialRepository);

                // Test the factory function
                const FactoryClass = materialRepoCall[1];
                const _instance = new FactoryClass();

                expect(MongoMaterialRepository).toHaveBeenCalledWith(undefined);
            });
        });

        describe('domain services', () => {
            it('should register MaterialService with proper dependencies', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;
                const materialServiceCall = calls.find((call) => call[0] === DependencyToken.MaterialService);

                expect(materialServiceCall).toBeDefined();
                expect(materialServiceCall[0]).toBe(DependencyToken.MaterialService);

                // Test the factory function
                const FactoryClass = materialServiceCall[1];
                const _instance = new FactoryClass();

                expect(MaterialService).toHaveBeenCalledWith(undefined, undefined);
                expect(mockDependencyContainer.resolve).toHaveBeenCalledWith(DependencyToken.MaterialRepository);
                expect(mockDependencyContainer.resolve).toHaveBeenCalledWith(DependencyToken.IdGenerator);
            });

            it('should register ImageService with proper dependencies', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;
                const imageServiceCall = calls.find((call) => call[0] === DependencyToken.ImageService);

                expect(imageServiceCall).toBeDefined();
                expect(imageServiceCall[0]).toBe(DependencyToken.ImageService);

                // Test the factory function
                const FactoryClass = imageServiceCall[1];
                const _instance = new FactoryClass();

                expect(ImageService).toHaveBeenCalledWith(undefined, undefined, undefined);
                expect(mockDependencyContainer.resolve).toHaveBeenCalledWith(DependencyToken.ImageStore);
                expect(mockDependencyContainer.resolve).toHaveBeenCalledWith(DependencyToken.Logger);
            });

            it('should register DesignService with proper dependencies', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;
                const designServiceCall = calls.find((call) => call[0] === DependencyToken.DesignService);

                expect(designServiceCall).toBeDefined();
                expect(designServiceCall[0]).toBe(DependencyToken.DesignService);

                // Test the factory function
                const FactoryClass = designServiceCall[1];
                const _instance = new FactoryClass();

                expect(DesignService).toHaveBeenCalledWith(undefined, undefined, undefined);
                expect(mockDependencyContainer.resolve).toHaveBeenCalledWith(DependencyToken.DesignRepository);
                expect(mockDependencyContainer.resolve).toHaveBeenCalledWith(DependencyToken.ImageService);
                expect(mockDependencyContainer.resolve).toHaveBeenCalledWith(DependencyToken.IdGenerator);
            });
        });

        describe('registration count', () => {
            it('should register exactly 8 dependencies', () => {
                // Core infrastructure: Database, Logger, Bucket, IdGenerator (4)
                // Infrastructure adapters: ImageStore (1)
                // Repositories: DesignRepository, MaterialRepository (2)
                // Domain services: MaterialService, ImageService, DesignService (3)
                // Total: 10
                expect(mockDependencyContainer.registerSingleton).toHaveBeenCalledTimes(10);
            });

            it('should register all expected dependency tokens', () => {
                const registeredTokens = mockDependencyContainer.registerSingleton.mock.calls.map((call) => call[0]);

                const expectedTokens = [
                    DependencyToken.Database,
                    DependencyToken.Logger,
                    DependencyToken.Bucket,
                    DependencyToken.IdGenerator,
                    DependencyToken.ImageStore,
                    DependencyToken.DesignRepository,
                    DependencyToken.MaterialRepository,
                    DependencyToken.MaterialService,
                    DependencyToken.ImageService,
                    DependencyToken.DesignService,
                ];

                expectedTokens.forEach((token) => {
                    expect(registeredTokens).toContain(token);
                });
            });
        });

        describe('dependency resolution order', () => {
            it('should register core infrastructure first', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;

                // First 4 calls should be core infrastructure
                expect(calls[0][0]).toBe(DependencyToken.Database);
                expect(calls[1][0]).toBe(DependencyToken.Logger);
                expect(calls[2][0]).toBe(DependencyToken.Bucket);
                expect(calls[3][0]).toBe(DependencyToken.IdGenerator);
            });

            it('should register infrastructure adapters after core', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;

                // 5th call should be ImageStore
                expect(calls[4][0]).toBe(DependencyToken.ImageStore);
            });

            it('should register repositories after infrastructure', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;

                // Calls 6-7 should be repositories
                const repositoryTokens = [DependencyToken.DesignRepository, DependencyToken.MaterialRepository];

                repositoryTokens.forEach((token, index) => {
                    expect(calls[5 + index][0]).toBe(token);
                });
            });

            it('should register domain services last', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;

                // Last 3 calls should be domain services
                const serviceTokens = [
                    DependencyToken.MaterialService,
                    DependencyToken.ImageService,
                    DependencyToken.DesignService,
                ];

                serviceTokens.forEach((token, index) => {
                    expect(calls[7 + index][0]).toBe(token);
                });
            });
        });

        describe('factory class behavior', () => {
            it('should create factory classes that return instances', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;

                // Test each factory class can be instantiated
                calls.forEach(([_token, FactoryClass]) => {
                    expect(() => new FactoryClass()).not.toThrow();
                });
            });

            it('should have factories that resolve dependencies from container', () => {
                const calls = mockDependencyContainer.registerSingleton.mock.calls;
                const serviceFactories = calls.filter(([token]) =>
                    [
                        DependencyToken.MaterialService,
                        DependencyToken.ImageService,
                        DependencyToken.DesignService,
                        DependencyToken.ImageStore,
                        DependencyToken.DesignRepository,
                        DependencyToken.MaterialRepository,
                    ].includes(token)
                );

                // Clear resolve calls from previous tests
                mockDependencyContainer.resolve.mockClear();

                // Instantiate all service factories
                serviceFactories.forEach(([, FactoryClass]) => {
                    new FactoryClass();
                });

                // Verify resolve was called
                expect(mockDependencyContainer.resolve.mock.calls.length).toBeGreaterThan(0);
            });
        });
    });
});
