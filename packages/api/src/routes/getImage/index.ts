import { Context } from 'koa';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

export const getImage = async (ctx: Context) => {
    const { id } = ctx.params;

    if (Array.isArray(id)) {
        throw new Error('Inalid path params');
    }

    const bucket = DependencyContainer.getInstance().resolve(DependencyToken.Bucket);

    const objectStream = await bucket.getObjectStream(id);
    const imageStats = await bucket.getHeadObject(id);

    const { 'content-type': contentType } = imageStats.metaData;
    ctx.set('Content-Type', contentType);

    ctx.status = 200;

    const pipe = async () => {
        return new Promise((resolve, reject) => {
            objectStream.pipe(ctx.res, { end: true });
            objectStream.on('end', resolve);
            objectStream.on('error', reject);
        });
    };

    await pipe();
};
