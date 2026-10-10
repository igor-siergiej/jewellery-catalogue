import { useAuth } from '@imapps/web-utils';
import type { Sale } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';

import { makeGetUnmatchedEtsySalesRequest } from '../api/endpoints/etsySales';

export const useUnmatchedEtsySales = (enabled: boolean): { sales: Sale[] } => {
    const { accessToken, login, logout } = useAuth();

    const { data } = useQuery({
        queryKey: ['etsy-unmatched-sales'],
        queryFn: () => makeGetUnmatchedEtsySalesRequest(() => accessToken, login, logout),
        enabled: enabled && !!accessToken,
    });

    return { sales: data ?? [] };
};
