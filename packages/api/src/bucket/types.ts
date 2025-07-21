import { PersistentFile } from '@jewellery-catalogue/types';
import { BucketItemStat, UploadedObjectInfo } from 'minio/dist/main/internal/type';
import { Readable } from 'stream';

export interface IBucket {
    addImage: (objectName: string, image: PersistentFile) => Promise<UploadedObjectInfo>;
    getHeadObject: (id: string) => Promise<BucketItemStat>;
    getObjectStream: (id: string) => Promise<Readable>;
}
