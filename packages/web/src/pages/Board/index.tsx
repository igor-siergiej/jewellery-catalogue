import { useAuth } from '@imapps/web-utils';
import type { TaskStatus } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getGoalsQuery } from '../../api/endpoints/goals';
import { getTasksQuery, makeUpdateTaskRequest } from '../../api/endpoints/tasks';
import LoadingScreen from '../../components/Loading';
import TaskBoard from '../../components/TaskBoard';
import AddTaskDialog from '../../components/TaskBoard/AddTaskDialog';
import { Button } from '../../components/ui/button';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const Board = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();
    const { dispatch } = useAlert();
    const [addTaskOpen, setAddTaskOpen] = useState(false);

    const { data: tasks, isLoading: tasksLoading } = useQuery(getTasksQuery(() => accessToken, login, logout));
    const { data: goals, isLoading: goalsLoading } = useQuery(getGoalsQuery(() => accessToken, login, logout));

    if (tasksLoading || goalsLoading) {
        return <LoadingScreen />;
    }

    const handleStatusChange = async (taskId: string, status: TaskStatus) => {
        try {
            await makeUpdateTaskRequest(taskId, { status }, () => accessToken, login, logout);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during updating task! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Board</h1>
                <Button onClick={() => setAddTaskOpen(true)}>Add Task</Button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{tasks?.length ?? 0} tasks</p>
            <TaskBoard tasks={tasks ?? []} onStatusChange={handleStatusChange} />
            <p className="text-sm text-muted-foreground mb-2 mt-6">{goals?.length ?? 0} goals</p>
            <ul>
                {goals?.map((goal) => (
                    <li key={goal.id} className="text-sm py-1">
                        {goal.title}: {goal.currentValue}/{goal.targetValue}
                    </li>
                ))}
            </ul>
            <AddTaskDialog
                open={addTaskOpen}
                onOpenChange={setAddTaskOpen}
                onCreated={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
            />
        </div>
    );
};

export default Board;
