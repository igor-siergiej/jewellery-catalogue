import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { EtsyConnection } from '@jewellery-catalogue/types';

import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { EtsyOAuthStateStore } from '../EtsyOAuthStateStore';
import { EtsyConnectionService } from './index';

const mockEtsyClient = {
    buildAuthorizationUrl: mock(),
    exchangeCodeForToken: mock(),
    refreshAccessToken: mock(),
    getMe: mock(),
    getShop: mock(),
};

const mockConnectionRepo = {
    getByUserId: mock(),
    upsert: mock(),
    deleteByUserId: mock(),
};

const mockStateStore = {
    save: mock(),
    consume: mock(),
};

const REDIRECT_URI = 'https://example.com/api/etsy/oauth/callback';

function makeConnection(overrides: Partial<EtsyConnection> = {}): EtsyConnection {
    return {
        userId: 'user-1',
        shopId: 47408839,
        shopName: 'MariCrystalJewellery',
        accessToken: 'access-token',
        accessTokenExpiresAt: Date.now() + 3600_000,
        refreshToken: 'refresh-token',
        connectedAt: Date.now(),
        ...overrides,
    };
}

describe('EtsyConnectionService', () => {
    let service: EtsyConnectionService;

    beforeEach(() => {
        Object.values(mockEtsyClient).forEach((m) => {
            m.mockClear();
        });
        Object.values(mockConnectionRepo).forEach((m) => {
            m.mockClear();
        });
        Object.values(mockStateStore).forEach((m) => {
            m.mockClear();
        });
        service = new EtsyConnectionService(
            mockEtsyClient as unknown as EtsyClient,
            mockConnectionRepo as unknown as EtsyConnectionRepository,
            mockStateStore as unknown as EtsyOAuthStateStore,
            REDIRECT_URI
        );
    });

    describe('startAuthorization', () => {
        it('saves state+verifier and returns the authorization url', () => {
            mockEtsyClient.buildAuthorizationUrl.mockReturnValue('https://www.etsy.com/oauth/connect?...');

            const result = service.startAuthorization('user-1');

            expect(result).toEqual({ url: 'https://www.etsy.com/oauth/connect?...' });
            expect(mockStateStore.save).toHaveBeenCalledTimes(1);
            const [state, data] = mockStateStore.save.mock.calls[0] as [
                string,
                { userId: string; codeVerifier: string },
            ];
            expect(data.userId).toBe('user-1');
            expect(typeof state).toBe('string');
            expect(typeof data.codeVerifier).toBe('string');

            expect(mockEtsyClient.buildAuthorizationUrl).toHaveBeenCalledWith(
                expect.objectContaining({ redirectUri: REDIRECT_URI, scope: expect.any(String) })
            );
        });
    });

    describe('handleCallback', () => {
        it('exchanges the code, looks up shop info, and persists the connection', async () => {
            mockStateStore.consume.mockReturnValue({ userId: 'user-1', codeVerifier: 'verifier-1' });
            mockEtsyClient.exchangeCodeForToken.mockResolvedValue({
                accessToken: 'at',
                refreshToken: 'rt',
                expiresIn: 3600,
            });
            mockEtsyClient.getMe.mockResolvedValue({ userId: 844469719, shopId: 47408839 });
            mockEtsyClient.getShop.mockResolvedValue({ shopId: 47408839, shopName: 'MariCrystalJewellery' });

            const result = await service.handleCallback('auth-code', 'the-state');

            expect(result).toEqual({ userId: 'user-1' });
            expect(mockEtsyClient.exchangeCodeForToken).toHaveBeenCalledWith({
                code: 'auth-code',
                codeVerifier: 'verifier-1',
                redirectUri: REDIRECT_URI,
            });
            expect(mockConnectionRepo.upsert).toHaveBeenCalledTimes(1);
            const persisted = mockConnectionRepo.upsert.mock.calls[0][0] as EtsyConnection;
            expect(persisted.userId).toBe('user-1');
            expect(persisted.shopId).toBe(47408839);
            expect(persisted.shopName).toBe('MariCrystalJewellery');
            expect(persisted.accessToken).toBe('at');
            expect(persisted.refreshToken).toBe('rt');
        });

        it('throws when the state is invalid or expired', async () => {
            mockStateStore.consume.mockReturnValue(null);

            await expect(service.handleCallback('auth-code', 'bad-state')).rejects.toThrow();
            expect(mockEtsyClient.exchangeCodeForToken).not.toHaveBeenCalled();
        });
    });

    describe('getStatus', () => {
        it('returns connected:false when no connection exists', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(null);

            expect(await service.getStatus('user-1')).toEqual({ connected: false });
        });

        it('returns connected:true with shop name when a connection exists', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(makeConnection());

            expect(await service.getStatus('user-1')).toEqual({
                connected: true,
                shopName: 'MariCrystalJewellery',
                broken: undefined,
            });
        });

        it('surfaces broken:true', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(makeConnection({ broken: true }));

            expect(await service.getStatus('user-1')).toEqual({
                connected: true,
                shopName: 'MariCrystalJewellery',
                broken: true,
            });
        });
    });

    describe('disconnect', () => {
        it('deletes the stored connection', async () => {
            await service.disconnect('user-1');

            expect(mockConnectionRepo.deleteByUserId).toHaveBeenCalledWith('user-1');
        });
    });

    describe('getValidAccessToken', () => {
        it('returns the stored access token when it has more than 60s of life left', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(
                makeConnection({ accessToken: 'still-fresh', accessTokenExpiresAt: Date.now() + 120_000 })
            );

            expect(await service.getValidAccessToken('user-1')).toBe('still-fresh');
            expect(mockEtsyClient.refreshAccessToken).not.toHaveBeenCalled();
        });

        it('refreshes and persists the new pair when the token is near expiry', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(
                makeConnection({ accessToken: 'stale', accessTokenExpiresAt: Date.now() + 10_000 })
            );
            mockEtsyClient.refreshAccessToken.mockResolvedValue({
                accessToken: 'fresh',
                refreshToken: 'fresh-refresh',
                expiresIn: 3600,
            });

            const token = await service.getValidAccessToken('user-1');

            expect(token).toBe('fresh');
            const persisted = mockConnectionRepo.upsert.mock.calls[0][0] as EtsyConnection;
            expect(persisted.accessToken).toBe('fresh');
            expect(persisted.refreshToken).toBe('fresh-refresh');
            expect(persisted.broken).toBeFalsy();
        });

        it('marks the connection broken and throws when refresh fails', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(
                makeConnection({ accessTokenExpiresAt: Date.now() + 10_000 })
            );
            mockEtsyClient.refreshAccessToken.mockRejectedValue(new Error('refresh failed'));

            await expect(service.getValidAccessToken('user-1')).rejects.toThrow();
            const persisted = mockConnectionRepo.upsert.mock.calls[0][0] as EtsyConnection;
            expect(persisted.broken).toBe(true);
        });

        it('throws when there is no connection for the user', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(null);

            await expect(service.getValidAccessToken('user-1')).rejects.toThrow();
        });
    });

    describe('getPushCredentials', () => {
        it('returns the valid access token together with the stored shopId', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(
                makeConnection({
                    accessToken: 'still-fresh',
                    accessTokenExpiresAt: Date.now() + 120_000,
                    shopId: 47408839,
                })
            );

            const result = await service.getPushCredentials('user-1');

            expect(result).toEqual({ accessToken: 'still-fresh', shopId: 47408839 });
            expect(mockEtsyClient.refreshAccessToken).not.toHaveBeenCalled();
        });

        it('throws when there is no connection', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(null);

            await expect(service.getPushCredentials('user-1')).rejects.toThrow();
        });
    });

    describe('getShopId', () => {
        it('returns the stored shopId without touching token refresh', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(makeConnection({ shopId: 47408839 }));

            const result = await service.getShopId('user-1');

            expect(result).toBe(47408839);
            expect(mockEtsyClient.refreshAccessToken).not.toHaveBeenCalled();
        });

        it('throws when there is no connection', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(null);

            await expect(service.getShopId('user-1')).rejects.toThrow();
        });
    });
});
