import { MethodType } from '@jewellery-catalogue/types';

import { ETSY_SHIPPING_PROFILES_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export interface EtsyShippingProfile {
    shippingProfileId: number;
    title: string;
}

export const makeGetEtsyShippingProfilesRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyShippingProfile[]>(
        {
            pathname: ETSY_SHIPPING_PROFILES_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch etsy shipping profiles',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
