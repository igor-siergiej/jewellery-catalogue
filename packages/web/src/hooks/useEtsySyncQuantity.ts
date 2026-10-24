import { useAuth } from '@imapps/web-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { makeSyncEtsyQuantityRequest } from '../api/endpoints/etsySyncQuantity';
import { track } from '../utils/analytics';

export const useEtsySyncQuantity = (designId: string) => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const syncMutation = useMutation({
        mutationFn: () => makeSyncEtsyQuantityRequest(designId, () => accessToken, login, logout),
        onSuccess: (updated) => {
            queryClient.setQueryData(['design', designId], updated);
            track('etsy_quantity_synced', { designId });
        },
    });

    return {
        sync: syncMutation.mutateAsync,
        isSyncing: syncMutation.isPending,
        syncError: syncMutation.error,
    };
};
