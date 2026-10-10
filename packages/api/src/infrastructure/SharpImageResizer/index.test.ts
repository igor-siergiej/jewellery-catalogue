import { describe, expect, it } from 'bun:test';
import sharp from 'sharp';

import { SharpImageResizer } from './index';

const makeJpeg = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: '#c0a080' } })
        .jpeg()
        .toBuffer();

describe('SharpImageResizer', () => {
    const resizer = new SharpImageResizer();

    it('fits the longest side within the limit and outputs WebP', async () => {
        const output = await resizer.toWebp(await makeJpeg(2000, 1000), 400);

        const meta = await sharp(output).metadata();
        expect([meta.format, meta.width, meta.height]).toEqual(['webp', 400, 200]);
    });

    it('never upscales a small image', async () => {
        const output = await resizer.toWebp(await makeJpeg(300, 200), 1600);

        const meta = await sharp(output).metadata();
        expect([meta.width, meta.height]).toEqual([300, 200]);
    });

    it('rejects data that is not an image', async () => {
        await expect(resizer.toWebp(Buffer.from('not an image'), 400)).rejects.toThrow();
    });
});
