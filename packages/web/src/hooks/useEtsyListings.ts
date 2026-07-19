import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { type EtsyListingWithLinkStatus, makeGetEtsyListingsRequest } from '../api/endpoints/etsyListings';

export const useEtsyListings = (
    enabled: boolean
): { listings: EtsyListingWithLinkStatus[]; isLoading: boolean; isError: boolean } => {
    const { accessToken, login, logout } = useAuth();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['etsy-listings'],
        queryFn: () => makeGetEtsyListingsRequest(() => accessToken, login, logout),
        enabled: enabled && !!accessToken,
    });

    return {
        listings: data ?? [],
        isLoading,
        isError,
    };
};
