import { ObjectId } from 'mongodb';

import { Material } from '..';
import { Design } from '../design';

export interface Catalogue {
    _id: ObjectId;
    designs: Array<Design>;
    materials: Array<Material>;
}
