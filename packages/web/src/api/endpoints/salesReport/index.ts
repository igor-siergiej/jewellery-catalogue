import { MethodType, type SalesReport } from '@jewellery-catalogue/types';

import { SALES_REPORT_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGetSalesReportRequest = (
    range: { from: number | null },
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) => {
    const query = range.from !== null ? `?from=${range.from}` : '';
    return makeRequestWithAutoRefresh<SalesReport>(
        {
            pathname: `${SALES_REPORT_ENDPOINT}${query}`,
            method: MethodType.GET,
            operationString: 'fetch sales report',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
};
