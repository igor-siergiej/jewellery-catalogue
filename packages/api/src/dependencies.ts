import { Bucket } from './bucket';
import { Database } from './database';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';
import { Logger } from './logger';

export const registerDepdendencies = () => {
    const dependencyContainer = DependencyContainer.getInstance();

    dependencyContainer.registerSingleton(DependencyToken.Logger, Logger);
    dependencyContainer.registerSingleton(DependencyToken.Database, Database);
    dependencyContainer.registerSingleton(DependencyToken.Bucket, Bucket);
};
