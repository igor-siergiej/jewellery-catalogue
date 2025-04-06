import { IBucket } from 'src/bucket/types';
import { IDatabase } from '../../database/types';

export type ConstructorOfType<T> = new (...args: Array<unknown>) => T;

export enum DependencyToken {
    Database = 'Database',
    Bucket = 'Bucket',
    Logger = 'Logger'
}

export interface IInstances {
    [DependencyToken.Database]?: IDatabase;
    [DependencyToken.Logger]?: ILogger;
    [DependencyToken.Bucket]?: IBucket;
}

export type IDependencies = {
    [key in keyof IInstances]?: ConstructorOfType<IInstances[key]>
};

export interface ILogger {
    debug: () => void;
}
