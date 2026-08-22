import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { getGoalsQuery } from '../../api/endpoints/goals';
import { getTasksQuery } from '../../api/endpoints/tasks';
import LoadingScreen from '../../components/Loading';

const Board = () => {
    const { accessToken, login, logout } = useAuth();

    const { data: tasks, isLoading: tasksLoading } = useQuery(getTasksQuery(() => accessToken, login, logout));
    const { data: goals, isLoading: goalsLoading } = useQuery(getGoalsQuery(() => accessToken, login, logout));

    if (tasksLoading || goalsLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Board</h1>
            <p className="text-sm text-muted-foreground mb-2">{tasks?.length ?? 0} tasks</p>
            <ul className="mb-6">
                {tasks?.map((task) => (
                    <li key={task.id} className="text-sm py-1">
                        {task.title} — {task.status}
                    </li>
                ))}
            </ul>
            <p className="text-sm text-muted-foreground mb-2">{goals?.length ?? 0} goals</p>
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
