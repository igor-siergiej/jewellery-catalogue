import { Context } from 'koa';
import jwt from 'jsonwebtoken';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { IConfig } from '../../lib/config/types';

export const verify = async (ctx: Context) => {
    const config = DependencyContainer.getInstance().resolve(DependencyToken.Config) as IConfig;
    const authHeader = ctx.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Authorization header missing or malformed' };
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, config.jwtSecret) as { aud?: string };
        if (payload.aud !== 'auth-service') {
            ctx.status = 401;
            ctx.body = { success: false, message: 'Invalid or expired token' };
            return;
        }
        
        ctx.body = { success: true, payload };
    } catch (error) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Invalid or expired token' };
    }
}; 