import { useAuth } from '@imapps/web-utils';
import type { Goal, Task, TaskImportance, TaskStatus, TaskSubject } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getGoalsQuery, makeUpdateGoalRequest } from '../../api/endpoints/goals';
import { getTasksQuery, makeUpdateTaskRequest } from '../../api/endpoints/tasks';
import GoalProgress from '../../components/GoalProgress';
import AddGoalDialog from '../../components/GoalProgress/AddGoalDialog';
import EditGoalDialog from '../../components/GoalProgress/EditGoalDialog';
import { StateView } from '../../components/StateView';
import TaskBoard from '../../components/TaskBoard';
import AddTaskDialog from '../../components/TaskBoard/AddTaskDialog';
import EditTaskDialog from '../../components/TaskBoard/EditTaskDialog';
import TaskFilters from '../../components/TaskBoard/TaskFilters';
import { Button } from '../../components/ui/button';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { pluralise } from '../../lib/boardLabels';

const Board = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();
    const { dispatch } = useAlert();
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [addGoalOpen, setAddGoalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [subjectFilter, setSubjectFilter] = useState<TaskSubject | 'all'>('all');
    const [importanceFilter, setImportanceFilter] = useState<Set<TaskImportance>>(new Set());

    const {
        data: tasks,
        isLoading: tasksLoading,
        isError: tasksIsError,
        refetch: refetchTasks,
    } = useQuery({
        ...getTasksQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const {
        data: goals,
        isLoading: goalsLoading,
        isError: goalsIsError,
        refetch: refetchGoals,
    } = useQuery({
        ...getGoalsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

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

    if (tasksIsError || goalsIsError) {
        return (
            <div className="p-4 md:p-6">
                <StateView
                    kind="error"
                    what="your board"
                    onRetry={() => {
                        refetchTasks();
                        refetchGoals();
                    }}
                />
            </div>
        );
    }

    if (tasksLoading || goalsLoading) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="loading" what="your board" />
            </div>
        );
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

    const handleToggleFavourite = async (taskId: string) => {
        const task = (tasks ?? []).find((t) => t.id === taskId);

        if (!task) return;

        try {
            await makeUpdateTaskRequest(taskId, { favourite: !task.favourite }, () => accessToken, login, logout);
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

    const handleToggleChecklistItem = async (taskId: string, itemId: string) => {
        const task = (tasks ?? []).find((t) => t.id === taskId);

        if (!task?.checklist) return;

        const checklist = task.checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item));

        try {
            await makeUpdateTaskRequest(taskId, { checklist }, () => accessToken, login, logout);
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

    const handleToggleGoalFavourite = async (goalId: string) => {
        const goal = (goals ?? []).find((g) => g.id === goalId);

        if (!goal) return;

        try {
            await makeUpdateGoalRequest(goalId, { favourite: !goal.favourite }, () => accessToken, login, logout);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown Error';

            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Error occured during updating goal! :(',
                    message: `Details: ${message}`,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        }
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-3xl font-semibold">Board</h1>
                <Button className="min-h-11 md:min-h-9" onClick={() => setAddTaskOpen(true)}>
                    Add task
                </Button>
            </div>

            <section aria-labelledby="goals-heading" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="goals-heading" className="text-sm text-muted-foreground">
                        {pluralise(goals?.length ?? 0, 'goal')}
                    </h2>
                    <Button variant="outline" className="min-h-11 md:min-h-9" onClick={() => setAddGoalOpen(true)}>
                        Add goal
                    </Button>
                </div>
                {(goals?.length ?? 0) > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {goals?.map((goal) => (
                            <GoalProgress
                                key={goal.id}
                                goal={goal}
                                onSynced={() => queryClient.invalidateQueries({ queryKey: ['goals'] })}
                                onEdit={setEditingGoal}
                                onToggleFavourite={handleToggleGoalFavourite}
                            />
                        ))}
                    </div>
                )}
            </section>

            <div className="space-y-4">
                <TaskFilters
                    tasks={tasks ?? []}
                    subjectFilter={subjectFilter}
                    importanceFilter={importanceFilter}
                    onSubjectFilterChange={setSubjectFilter}
                    onImportanceFilterChange={toggleImportanceFilter}
                />
                <TaskBoard
                    tasks={filteredTasks}
                    onStatusChange={handleStatusChange}
                    onToggleFavourite={handleToggleFavourite}
                    onToggleChecklistItem={handleToggleChecklistItem}
                    onEdit={setEditingTask}
                />
            </div>

            {addTaskOpen && (
                <AddTaskDialog
                    open
                    onOpenChange={setAddTaskOpen}
                    onCreated={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                />
            )}
            {addGoalOpen && (
                <AddGoalDialog
                    open
                    onOpenChange={setAddGoalOpen}
                    onCreated={() => queryClient.invalidateQueries({ queryKey: ['goals'] })}
                />
            )}
            {editingGoal && (
                <EditGoalDialog
                    key={editingGoal.id}
                    goal={editingGoal}
                    onOpenChange={(open) => {
                        if (!open) setEditingGoal(null);
                    }}
                    onUpdated={() => queryClient.invalidateQueries({ queryKey: ['goals'] })}
                />
            )}
            {editingTask && (
                <EditTaskDialog
                    key={editingTask.id}
                    task={editingTask}
                    onOpenChange={(open) => {
                        if (!open) setEditingTask(null);
                    }}
                    onUpdated={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                />
            )}
        </div>
    );
};

export default Board;
