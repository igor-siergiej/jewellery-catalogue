import { Context } from 'koa';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { CollectionName } from '../../lib/database/types';
import { IConfig } from '../../lib/config/types';

interface IUser {
    username: string;
    passwordHash: string;
}

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const register = async (ctx: Context) => {
    const { username, password } = ctx.request.body as { username?: string; password?: string };

    console.log(ctx.headers);
    console.log(ctx.protocol);
    console.log(ctx.secure);
    console.log(ctx.request.headers);

    if (!username || !password) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Username and password are required' };
        return;
    }

    // TODO: move this to use an acutal library or something
    // Simple password strength check (at least 8 chars incl num/letter)
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Password too weak' };
        return;
    }

    const container = DependencyContainer.getInstance();
    const database = container.resolve(DependencyToken.Database)!;
    const { jwtSecret, accessTokenExpiry, refreshTokenExpiry, secure, sameSite } = container.resolve(DependencyToken.Config) as IConfig;

    const usersCollection = database.getCollection<any>(CollectionName.Users);

    const existing = await usersCollection.findOne({ username });
    if (existing) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Registration failed' };
        return;
    }

    const saltRounds = 14;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const result = await usersCollection.insertOne({ username, passwordHash } as IUser);

    // generate tokens
    const tokenPayload = { sub: username, username, id: result.insertedId, aud: 'auth-service' };
    const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: accessTokenExpiry } as SignOptions);
    const refreshToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: refreshTokenExpiry } as SignOptions);

    // Prevent caching of tokens
    ctx.set('Cache-Control', 'no-store');
    ctx.set('Pragma', 'no-cache');

    // Save session with hashed refresh token
    const sessionsCollection = database.getCollection<any>(CollectionName.Sessions);
    const tokenHash = hashToken(refreshToken);
    await sessionsCollection.insertOne({ username, tokenHash, createdAt: new Date() });

    // Set cookie
    ctx.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure,
        sameSite,
        maxAge: 30 * 24 * 60 * 60 * 1000
    });

    ctx.body = {
        accessToken
    };
}; 