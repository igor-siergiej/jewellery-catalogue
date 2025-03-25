import Router from 'koa-router';
import { Context } from 'koa';

const router = new Router();

router.get('/hello', async (ctx: Context) => {
    ctx.body = { message: 'Hello, World!' };
});

export default router;
