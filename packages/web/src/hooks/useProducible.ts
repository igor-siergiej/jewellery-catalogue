import { useAuth } from '@imapps/web-utils';
import type { ProducibleSummary } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { makeGetProducibleRequest } from '../api/endpoints/productionPlan';

export const PRODUCIBLE_QUERY_KEY = ['designs-producible'];

export const useProducible = (): Map<string, ProducibleSummary> => {
    const { accessToken, login, logout } = useAuth();

    const { data } = useQuery({
        queryKey: PRODUCIBLE_QUERY_KEY,
        queryFn: () => makeGetProducibleRequest(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    return useMemo(() => new Map((data ?? []).map((s) => [s.designId, s])), [data]);
};
