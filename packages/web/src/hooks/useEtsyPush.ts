import { useAuth } from '@imapps/web-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type EtsyPushOverrides, makePushDesignToEtsyRequest } from '../api/endpoints/etsyPush';

export const useEtsyPush = (designId: string) => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const pushMutation = useMutation({
        mutationFn: (overrides: EtsyPushOverrides) =>
            makePushDesignToEtsyRequest(designId, overrides, () => accessToken, login, logout),
        onSuccess: (updated) => {
            queryClient.setQueryData(['design', designId], updated);
        },
    });

    return {
        push: pushMutation.mutateAsync,
        isPushing: pushMutation.isPending,
        pushError: pushMutation.error,
    };
};
