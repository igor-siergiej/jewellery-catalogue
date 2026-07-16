import { APIError } from '@imapps/api-utils/hono';
import type { EtsyConnection, EtsyConnectionStatus } from '@jewellery-catalogue/types';
import type { EtsyClient } from '../EtsyClient';
import { generateCodeChallenge, generateCodeVerifier, generateState } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { EtsyOAuthStateStore } from '../EtsyOAuthStateStore';

const SCOPES = 'listings_r listings_w shops_r transactions_r email_r';
const REFRESH_MARGIN_MS = 60_000;

export class EtsyConnectionService {
    constructor(
        private readonly etsyClient: EtsyClient,
        private readonly connectionRepo: EtsyConnectionRepository,
        private readonly stateStore: EtsyOAuthStateStore,
        private readonly redirectUri: string
    ) {}

    startAuthorization(userId: string): { url: string } {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = generateState();

        this.stateStore.save(state, { userId, codeVerifier });

        const url = this.etsyClient.buildAuthorizationUrl({
            redirectUri: this.redirectUri,
            state,
            codeChallenge,
            scope: SCOPES,
        });

        return { url };
    }

    async handleCallback(code: string, state: string): Promise<{ userId: string }> {
        const pending = this.stateStore.consume(state);
        if (!pending) {
            throw new APIError('Invalid or expired Etsy OAuth state', 400);
        }

        const tokens = await this.etsyClient.exchangeCodeForToken({
            code,
            codeVerifier: pending.codeVerifier,
            redirectUri: this.redirectUri,
        });

        const me = await this.etsyClient.getMe(tokens.accessToken);
        const shop = await this.etsyClient.getShop(me.shopId);

        const connection: EtsyConnection = {
            userId: pending.userId,
            shopId: shop.shopId,
            shopName: shop.shopName,
            accessToken: tokens.accessToken,
            accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
            refreshToken: tokens.refreshToken,
            connectedAt: Date.now(),
        };

        await this.connectionRepo.upsert(connection);

        return { userId: pending.userId };
    }

    async getStatus(userId: string): Promise<EtsyConnectionStatus> {
        const connection = await this.connectionRepo.getByUserId(userId);
        if (!connection) return { connected: false };

        return { connected: true, shopName: connection.shopName, broken: connection.broken };
    }

    async disconnect(userId: string): Promise<void> {
        await this.connectionRepo.deleteByUserId(userId);
    }

    async getValidAccessToken(userId: string): Promise<string> {
        const connection = await this.connectionRepo.getByUserId(userId);
        if (!connection) {
            throw new APIError('Etsy is not connected', 400);
        }

        if (connection.accessTokenExpiresAt - Date.now() > REFRESH_MARGIN_MS) {
            return connection.accessToken;
        }

        try {
            const tokens = await this.etsyClient.refreshAccessToken(connection.refreshToken);
            const updated: EtsyConnection = {
                ...connection,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
                broken: false,
            };
            await this.connectionRepo.upsert(updated);
            return updated.accessToken;
        } catch (error) {
            await this.connectionRepo.upsert({ ...connection, broken: true });
            throw new APIError('Etsy connection is broken — reconnect required', 409);
        }
    }
}
