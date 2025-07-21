import { DependencyContainer } from './lib/dependencyContainer';
import { Database } from './lib/database';
import { DependencyToken } from './lib/dependencyContainer/types';
import { ConfigService } from './lib/config';

export const registerDepdendencies = () => {
    const dependencyContainer = DependencyContainer.getInstance();
    dependencyContainer.registerSingleton(DependencyToken.Database, Database);
    dependencyContainer.registerSingleton(DependencyToken.Config, ConfigService);
};
