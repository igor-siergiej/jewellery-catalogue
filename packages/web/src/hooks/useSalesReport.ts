import { useAuth } from '@imapps/web-utils';
import type { SalesReport } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';

import { makeGetSalesReportRequest } from '../api/endpoints/salesReport';

export const useSalesReport = (from: number | null): { report: SalesReport | undefined } => {
    const { accessToken, login, logout } = useAuth();

    const { data } = useQuery({
        queryKey: ['sales-report', from],
        queryFn: () => makeGetSalesReportRequest({ from }, () => accessToken, login, logout),
        enabled: !!accessToken,
    });

    return { report: data };
};
