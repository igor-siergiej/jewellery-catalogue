import { useAuth } from '@imapps/web-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { makeSyncEtsyQuantityRequest } from '../api/endpoints/etsySyncQuantity';

export const useEtsySyncQuantity = (designId: string) => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const syncMutation = useMutation({
        mutationFn: () => makeSyncEtsyQuantityRequest(designId, () => accessToken, login, logout),
        onSuccess: (updated) => {
            queryClient.setQueryData(['design', designId], updated);
        },
    });

    return {
        sync: syncMutation.mutateAsync,
        isSyncing: syncMutation.isPending,
        syncError: syncMutation.error,
    };
};
