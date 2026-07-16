import { z } from 'zod';

export const etsyConnectionSchema = z.object({
    userId: z.string(),
    shopId: z.number(),
    shopName: z.string(),
    accessToken: z.string(),
    accessTokenExpiresAt: z.number(), // epoch ms
    refreshToken: z.string(),
    connectedAt: z.number(), // epoch ms
    broken: z.boolean().optional(),
});

export type EtsyConnection = z.infer<typeof etsyConnectionSchema>;

export interface EtsyConnectionStatus {
    connected: boolean;
    shopName?: string;
    broken?: boolean;
}
