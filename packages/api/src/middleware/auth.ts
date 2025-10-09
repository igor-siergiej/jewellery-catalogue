import { Context, Next } from 'koa';

interface JWTPayload {
    username: string;
    id: string;
    exp: number;
    iat: number;
}

/**
 * Authentication middleware that extracts and validates JWT token
 * Sets userId in ctx.state for use by handlers
 */
export const authenticate = async (ctx: Context, next: Next) => {
    try {
        // Extract token from Authorization header
        const authHeader = ctx.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            ctx.status = 401;
            ctx.body = { error: 'Missing or invalid authorization header' };

            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Decode JWT (mock implementation - in production use jsonwebtoken library)
        const parts = token.split('.');

        if (parts.length !== 3) {
            ctx.status = 401;
            ctx.body = { error: 'Invalid token format' };

            return;
        }

        // Decode payload
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as JWTPayload;

        // Check expiration
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            ctx.status = 401;
            ctx.body = { error: 'Token expired' };

            return;
        }

        // Validate payload has required fields
        if (!payload.id) {
            ctx.status = 401;
            ctx.body = { error: 'Invalid token payload - missing id' };

            return;
        }

        // Set userId in context state for handlers to use
        ctx.state.userId = payload.id;

        await next();
    } catch (error) {
        ctx.status = 401;
        ctx.body = { error: 'Invalid token' };
    }
};
