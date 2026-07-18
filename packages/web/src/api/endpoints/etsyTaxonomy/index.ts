import { MethodType } from '@jewellery-catalogue/types';

import { ETSY_TAXONOMY_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export interface EtsyTaxonomyNode {
    id: number;
    name: string;
    children: EtsyTaxonomyNode[];
}

export const makeGetEtsyTaxonomyRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyTaxonomyNode[]>(
        {
            pathname: ETSY_TAXONOMY_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch etsy taxonomy',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
