import { type FormGoal, type Goal, MethodType, type UpdateGoal } from '@jewellery-catalogue/types';

import { GOALS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

type AuthArgs = [getAccessToken: () => string, onTokenRefresh: (t: string) => void, onTokenClear: () => void];

export const getGoalsQuery = (...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs) => ({
    queryKey: ['goals'],
    queryFn: async () =>
        makeRequestWithAutoRefresh<Array<Goal>>(
            { pathname: GOALS_ENDPOINT, method: MethodType.GET, operationString: 'fetch goals', accessToken: '' },
            getAccessToken,
            onTokenRefresh,
            onTokenClear
        ),
});

export const makeCreateGoalRequest = async (
    data: FormGoal,
    ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs
) =>
    makeRequestWithAutoRefresh<Goal>(
        {
            pathname: GOALS_ENDPOINT,
            method: MethodType.POST,
            headers: {
                'Content-Type': 'application/json',
            },
            operationString: 'create goal',
            accessToken: '',
            body: data,
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeUpdateGoalRequest = async (
    id: string,
    data: UpdateGoal,
    ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs
) =>
    makeRequestWithAutoRefresh<Goal>(
        {
            pathname: `${GOALS_ENDPOINT}/${id}`,
            method: MethodType.PUT,
            headers: {
                'Content-Type': 'application/json',
            },
            operationString: 'update goal',
            accessToken: '',
            body: data,
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeSyncGoalEtsyValueRequest = async (
    id: string,
    ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs
) =>
    makeRequestWithAutoRefresh<Goal>(
        {
            pathname: `${GOALS_ENDPOINT}/${id}/etsy-sync`,
            method: MethodType.POST,
            operationString: 'sync goal from Etsy',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
