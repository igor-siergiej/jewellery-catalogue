import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { makeGetEtsyListingsRequest } from '../api/endpoints/etsyListings';

export const useEtsyListings = () => {
    const { accessToken, login, logout } = useAuth();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['etsy-listings'],
        queryFn: () => makeGetEtsyListingsRequest(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    return {
        listings: data ?? [],
        isLoading,
        isError,
    };
};
