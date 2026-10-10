import {
    MethodType,
    type ProducibleSummary,
    type ShoppingList,
    type ShoppingListRequest,
} from '@jewellery-catalogue/types';

import { PRODUCIBLE_ENDPOINT, SHOPPING_LIST_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGetProducibleRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<ProducibleSummary[]>(
        {
            pathname: PRODUCIBLE_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch producible quantities',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeShoppingListRequest = (
    request: ShoppingListRequest,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<ShoppingList>(
        {
            pathname: SHOPPING_LIST_ENDPOINT,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'build shopping list',
            body: request,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
