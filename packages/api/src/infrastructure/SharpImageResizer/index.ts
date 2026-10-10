import sharp from 'sharp';

import type { ImageResizer } from '../../domain/ImageService/types';

export class SharpImageResizer implements ImageResizer {
    async toWebp(buffer: Buffer, maxDimension: number): Promise<Buffer> {
        return (
            sharp(buffer)
                // Apply EXIF orientation before resizing so phone photos aren't sideways.
                .rotate()
                .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer()
        );
    }
}
