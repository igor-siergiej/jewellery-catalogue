import { useAuth } from '@imapps/web-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { makeRefreshEtsyStatusRequest } from '../api/endpoints/etsyStatus';

export const useEtsyStatus = (designId: string, enabled: boolean) => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    useQuery({
        queryKey: ['etsy-status', designId],
        queryFn: async () => {
            const design = await makeRefreshEtsyStatusRequest(designId, () => accessToken, login, logout);
            queryClient.setQueryData(['design', designId], design);
            return design;
        },
        enabled: enabled && !!accessToken && !!designId,
        staleTime: Number.POSITIVE_INFINITY,
    });
};
