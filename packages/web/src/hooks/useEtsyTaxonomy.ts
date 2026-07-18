import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { makeGetEtsyTaxonomyRequest } from '../api/endpoints/etsyTaxonomy';
import { flattenTaxonomyNodes } from '../utils/flattenTaxonomyNodes';

export const useEtsyTaxonomy = (enabled: boolean) => {
    const { accessToken, login, logout } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['etsy-taxonomy'],
        queryFn: () => makeGetEtsyTaxonomyRequest(() => accessToken, login, logout),
        enabled: enabled && !!accessToken,
        staleTime: Number.POSITIVE_INFINITY,
    });

    return {
        options: flattenTaxonomyNodes(data ?? []),
        isLoading,
    };
};
