import { useAuth } from '@imapps/web-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { makeCreateDesignFromListingRequest, makeLinkListingToDesignRequest } from '../api/endpoints/etsyReconcile';

export const useEtsyReconcile = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (listingId: number) =>
            makeCreateDesignFromListingRequest(listingId, () => accessToken, login, logout),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['etsy-listings'] });
            queryClient.invalidateQueries({ queryKey: ['designs'] });
        },
    });

    const linkMutation = useMutation({
        mutationFn: ({ listingId, designId }: { listingId: number; designId: string }) =>
            makeLinkListingToDesignRequest(listingId, designId, () => accessToken, login, logout),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['etsy-listings'] });
            queryClient.invalidateQueries({ queryKey: ['designs'] });
        },
    });

    return {
        createFromListing: createMutation.mutateAsync,
        linkToDesign: linkMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isLinking: linkMutation.isPending,
    };
};
