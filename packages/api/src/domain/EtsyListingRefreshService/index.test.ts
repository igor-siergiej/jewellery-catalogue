import { beforeEach, describe, expect, it, mock } from 'bun:test';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { EtsyListingCopyService } from '../EtsyListingCopyService';
import { EtsyListingRefreshService } from './index';

const designRepo = { getByUserId: mock() };
const copyService = { generate: mock() };
const etsyClient = { getListingDetail: mock(), updateListingCopy: mock() };
const connectionService = { getPushCredentials: mock() };

const proposed = { title: 'New Title', description: 'New description', tags: ['opal', 'ring'] };

describe('EtsyListingRefreshService', () => {
    let service: EtsyListingRefreshService;

    beforeEach(() => {
        for (const m of [
            ...Object.values(designRepo),
            ...Object.values(copyService),
            ...Object.values(etsyClient),
            ...Object.values(connectionService),
        ]) {
            m.mockReset();
        }
        designRepo.getByUserId.mockResolvedValue([
            { id: 'design-1', name: 'Opal Ring', etsy: { listingId: 111 } },
            { id: 'design-2', name: 'Unlinked' },
        ]);
        etsyClient.getListingDetail.mockResolvedValue({
            title: 'Old Title',
            description: 'Old description',
            tags: ['old'],
            price: 10,
            imageUrls: [],
        });
        copyService.generate.mockResolvedValue(proposed);
        connectionService.getPushCredentials.mockResolvedValue({ accessToken: 'at', shopId: 9 });
        service = new EtsyListingRefreshService(
            designRepo as unknown as DesignRepository,
            copyService as unknown as EtsyListingCopyService,
            etsyClient as unknown as EtsyClient,
            connectionService as unknown as EtsyConnectionService
        );
    });

    it('proposes new copy from the linked design next to the current Etsy copy, without updating Etsy', async () => {
        const proposal = await service.propose(111, 'user-1');

        expect(copyService.generate).toHaveBeenCalledWith('design-1', 'user-1');
        expect(proposal).toEqual({
            listingId: 111,
            designId: 'design-1',
            designName: 'Opal Ring',
            current: { title: 'Old Title', description: 'Old description', tags: ['old'] },
            proposed,
        });
        expect(etsyClient.updateListingCopy).not.toHaveBeenCalled();
    });

    it('refuses listings not linked to one of the user’s designs', async () => {
        await expect(service.propose(999, 'user-1')).rejects.toMatchObject({ status: 404 });
        await expect(service.apply(999, 'user-1', proposed)).rejects.toMatchObject({ status: 404 });
        expect(copyService.generate).not.toHaveBeenCalled();
        expect(etsyClient.updateListingCopy).not.toHaveBeenCalled();
    });

    it('applies accepted copy to that one listing in the user’s shop', async () => {
        await service.apply(111, 'user-1', proposed);

        expect(etsyClient.updateListingCopy).toHaveBeenCalledWith('at', 9, 111, proposed);
    });
});
