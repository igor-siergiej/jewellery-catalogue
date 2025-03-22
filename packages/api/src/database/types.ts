import { Collection } from 'mongodb/mongodb';
import { Design, Material } from 'types';

export enum CollectionName {
    Designs = 'designs',
    Materials = 'materials'
}

export interface IDatabase {
    connect: () => Promise<void>;
    getDesignsCollection: () => Collection<Design>;
    getMaterialsCollection: () => Collection<Material>;
}
