import { type FormTask, MethodType, type Task, type UpdateTask } from '@jewellery-catalogue/types';

import { TASKS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

type AuthArgs = [getAccessToken: () => string, onTokenRefresh: (t: string) => void, onTokenClear: () => void];

export const getTasksQuery = (...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs) => ({
    queryKey: ['tasks'],
    queryFn: async () =>
        makeRequestWithAutoRefresh<Array<Task>>(
            { pathname: TASKS_ENDPOINT, method: MethodType.GET, operationString: 'fetch tasks', accessToken: '' },
            getAccessToken,
            onTokenRefresh,
            onTokenClear
        ),
});

export const makeCreateTaskRequest = async (
    data: FormTask,
    ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs
) =>
    makeRequestWithAutoRefresh<Task>(
        {
            pathname: TASKS_ENDPOINT,
            method: MethodType.POST,
            headers: {
                'Content-Type': 'application/json',
            },
            operationString: 'create task',
            accessToken: '',
            body: data,
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeUpdateTaskRequest = async (
    id: string,
    data: UpdateTask,
    ...[getAccessToken, onTokenRefresh, onTokenClear]: AuthArgs
) =>
    makeRequestWithAutoRefresh<Task>(
        {
            pathname: `${TASKS_ENDPOINT}/${id}`,
            method: MethodType.PUT,
            headers: {
                'Content-Type': 'application/json',
            },
            operationString: 'update task',
            accessToken: '',
            body: data,
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
