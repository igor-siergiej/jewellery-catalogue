import { useAuth } from '@imapps/web-utils';
import type { TaskImportance, TaskStatus, TaskSubject } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getGoalsQuery } from '../../api/endpoints/goals';
import { getTasksQuery, makeUpdateTaskRequest } from '../../api/endpoints/tasks';
import GoalProgress from '../../components/GoalProgress';
import AddGoalDialog from '../../components/GoalProgress/AddGoalDialog';
import LoadingScreen from '../../components/Loading';
import TaskBoard from '../../components/TaskBoard';
import AddTaskDialog from '../../components/TaskBoard/AddTaskDialog';
import TaskFilters from '../../components/TaskBoard/TaskFilters';
import { Button } from '../../components/ui/button';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';

const Board = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();
    const { dispatch } = useAlert();
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [addGoalOpen, setAddGoalOpen] = useState(false);
    const [subjectFilter, setSubjectFilter] = useState<TaskSubject | 'all'>('all');
    const [importanceFilter, setImportanceFilter] = useState<Set<TaskImportance>>(new Set());

    const { data: tasks, isLoading: tasksLoading } = useQuery(getTasksQuery(() => accessToken, login, logout));
    const { data: goals, isLoading: goalsLoading } = useQuery(getGoalsQuery(() => accessToken, login, logout));

    const toggleImportanceFilter = (importance: TaskImportance) => {
        setImportanceFilter((prev) => {
            const next = new Set(prev);
            if (next.has(importance)) {
                next.delete(importance);
            } else {
                next.add(importance);
            }
            return next;
        });
    };

    const filteredTasks = useMemo(() => {
        return (tasks ?? []).filter((task) => {
            if (subjectFilter !== 'all' && task.subject !== subjectFilter) return false;
            if (importanceFilter.size > 0 && !importanceFilter.has(task.importance)) return false;
            return true;
        });
    }, [tasks, subjectFilter, importanceFilter]);

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
            <TaskFilters
                tasks={tasks ?? []}
                subjectFilter={subjectFilter}
                importanceFilter={importanceFilter}
                onSubjectFilterChange={setSubjectFilter}
                onImportanceFilterChange={toggleImportanceFilter}
            />
            <TaskBoard tasks={filteredTasks} onStatusChange={handleStatusChange} />

            <div className="flex items-center justify-between mb-2 mt-6">
                <p className="text-sm text-muted-foreground">{goals?.length ?? 0} goals</p>
                <Button variant="outline" onClick={() => setAddGoalOpen(true)}>
                    Add Goal
                </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
                {goals?.map((goal) => (
                    <GoalProgress
                        key={goal.id}
                        goal={goal}
                        onSynced={() => queryClient.invalidateQueries({ queryKey: ['goals'] })}
                    />
                ))}
            </div>

            <AddTaskDialog
                open={addTaskOpen}
                onOpenChange={setAddTaskOpen}
                onCreated={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
            />
            <AddGoalDialog
                open={addGoalOpen}
                onOpenChange={setAddGoalOpen}
                onCreated={() => queryClient.invalidateQueries({ queryKey: ['goals'] })}
            />
        </div>
    );
};

export default Board;
