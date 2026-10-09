import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { APIError } from '@imapps/api-utils/hono';

import '../../test-setup';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { EtsyPushService } from '../../domain/EtsyPushService';
import { pushDesignToEtsy } from './index';

// Reach into the singleton's private instance map to inject test doubles.
const containerInstances = dependencyContainer as unknown as { instances: Record<string, unknown> };

const push = mock(async () => ({ id: 'design-1' }));

const makeCtx = (body: unknown) =>
    ({
        get: (k: string) => (k === 'userId' ? 'user-1' : undefined),
        req: { param: () => 'design-1', json: async () => body },
        json: (b: unknown, status: number) => ({ body: b, status }),
    }) as unknown as Parameters<typeof pushDesignToEtsy>[0];

const expect400 = async (body: unknown) => {
    const err = await pushDesignToEtsy(makeCtx(body)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(APIError);
    expect((err as APIError).status).toBe(400);
    expect(push).not.toHaveBeenCalled();
};

describe('pushDesignToEtsy', () => {
    beforeEach(() => {
        push.mockClear();
        containerInstances.instances = {
            ...containerInstances.instances,
            [DependencyToken.EtsyPushService]: { push } as Partial<EtsyPushService>,
        };
    });

    it('rejects a blank description with 400', async () => {
        await expect400({ description: '   ' });
    });

    it('rejects a 141-char title with 400', async () => {
        await expect400({ title: 'a'.repeat(141) });
    });

    it('rejects 14 tags with 400', async () => {
        await expect400({ tags: Array.from({ length: 14 }, (_, i) => `tag ${i}`) });
    });

    it('forwards a valid body to EtsyPushService.push', async () => {
        const body = { title: 'Silver Ring', description: 'Lovely', tags: ['silver ring'], price: 25 };

        await pushDesignToEtsy(makeCtx(body));

        expect(push).toHaveBeenCalledWith('design-1', 'user-1', body);
    });
});
