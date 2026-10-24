import { useAuth } from '@imapps/web-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type EtsyPushOverrides, makePushDesignToEtsyRequest } from '../api/endpoints/etsyPush';
import { track } from '../utils/analytics';

export const useEtsyPush = (designId: string) => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const pushMutation = useMutation({
        mutationFn: (overrides: EtsyPushOverrides) =>
            makePushDesignToEtsyRequest(designId, overrides, () => accessToken, login, logout),
        onSuccess: (updated) => {
            queryClient.setQueryData(['design', designId], updated);
            track('etsy_push_completed', { designId });
        },
        onError: () => {
            track('etsy_push_failed', { designId });
        },
    });

    return {
        push: (overrides: EtsyPushOverrides) => {
            track('etsy_push_started', { designId });
            return pushMutation.mutateAsync(overrides);
        },
        isPushing: pushMutation.isPending,
        pushError: pushMutation.error,
    };
};
