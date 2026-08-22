import { useAuth } from '@imapps/web-utils';
import type { TaskStatus } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getGoalsQuery } from '../../api/endpoints/goals';
import { getTasksQuery, makeUpdateTaskRequest } from '../../api/endpoints/tasks';
import LoadingScreen from '../../components/Loading';
import TaskBoard from '../../components/TaskBoard';

const Board = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const { data: tasks, isLoading: tasksLoading } = useQuery(getTasksQuery(() => accessToken, login, logout));
    const { data: goals, isLoading: goalsLoading } = useQuery(getGoalsQuery(() => accessToken, login, logout));

    if (tasksLoading || goalsLoading) {
        return <LoadingScreen />;
    }

    const handleStatusChange = async (taskId: string, status: TaskStatus) => {
        await makeUpdateTaskRequest(taskId, { status }, () => accessToken, login, logout);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Board</h1>
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
        </div>
    );
};

export default Board;
