import { beforeEach, describe, expect, it } from 'bun:test';

import { dependencyContainer, registerDepdendencies } from './index';
import { DependencyToken } from './types';

describe('Dependencies', () => {
    beforeEach(() => {
        // Reset the container state
        const container = dependencyContainer as any;
        container.instances = {};
        container.constructors = {};
    });

    describe('registerDepdendencies', () => {
        it('should register Database', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.Database]).toBeDefined();
        });

        it('should register Logger', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.Logger]).toBeDefined();
        });

        it('should register Bucket', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.Bucket]).toBeDefined();
        });

        it('should register IdGenerator', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.IdGenerator]).toBeDefined();
        });

        it('should register ImageStore', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.ImageStore]).toBeDefined();
        });

        it('should register DesignRepository', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.DesignRepository]).toBeDefined();
        });

        it('should register MaterialRepository', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.MaterialRepository]).toBeDefined();
        });

        it('should register MaterialService', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.MaterialService]).toBeDefined();
        });

        it('should register ImageService', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.ImageService]).toBeDefined();
        });

        it('should register DesignService', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            expect(container.constructors?.[DependencyToken.DesignService]).toBeDefined();
        });

        it('should register exactly 10 dependencies', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            const registeredCount = Object.keys(container.constructors || {}).length;
            expect(registeredCount).toBe(10);
        });

        it('should register all expected tokens', () => {
            registerDepdendencies();
            const container = dependencyContainer as any;
            const registeredTokens = Object.keys(container.constructors || {});

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
});
