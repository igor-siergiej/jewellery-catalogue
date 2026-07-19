import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { makeGetEtsyShippingProfilesRequest } from '../api/endpoints/etsyShippingProfiles';

export const useEtsyShippingProfiles = (enabled: boolean) => {
    const { accessToken, login, logout } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['etsy-shipping-profiles'],
        queryFn: () => makeGetEtsyShippingProfilesRequest(() => accessToken, login, logout),
        enabled: enabled && !!accessToken,
    });

    return {
        profiles: data ?? [],
        isLoading,
    };
};
