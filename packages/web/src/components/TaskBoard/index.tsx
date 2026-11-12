import { DndContext, type DragEndEvent, useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '@jewellery-catalogue/types';

import { TASK_STATUS_LABELS } from '@/lib/boardLabels';
import { sortFavouritesFirst } from '@/lib/sortFavouritesFirst';

import TaskCard from './TaskCard';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = (['todo', 'in_progress', 'done'] as const).map(
    (status) => ({ status, label: TASK_STATUS_LABELS[status] })
);

const Column: React.FC<{
    status: TaskStatus;
    label: string;
    tasks: Array<Task>;
    onToggleFavourite: (taskId: string) => void;
    onToggleChecklistItem: (taskId: string, itemId: string) => void;
    onEdit: (task: Task) => void;
}> = ({ status, label, tasks, onToggleFavourite, onToggleChecklistItem, onEdit }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <section
            ref={setNodeRef}
            aria-label={label}
            className={`flex-1 rounded-lg border bg-muted/40 p-3 md:min-w-[240px] ${isOver ? 'ring-2 ring-primary' : ''}`}
        >
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{label}</h2>
                <span className="text-xs text-muted-foreground">{tasks.length}</span>
            </div>
            {tasks.length === 0 && <p className="px-1 py-2 text-sm text-muted-foreground">No tasks</p>}
            {sortFavouritesFirst(tasks).map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onToggleFavourite={onToggleFavourite}
                    onToggleChecklistItem={onToggleChecklistItem}
                    onEdit={onEdit}
                />
            ))}
        </section>
    );
};

const TaskBoard: React.FC<{
    tasks: Array<Task>;
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onToggleFavourite: (taskId: string) => void;
    onToggleChecklistItem: (taskId: string, itemId: string) => void;
    onEdit: (task: Task) => void;
}> = ({ tasks, onStatusChange, onToggleFavourite, onToggleChecklistItem, onEdit }) => {
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const newStatus = over.id as TaskStatus;
        const task = tasks.find((t) => t.id === active.id);

        if (task && task.status !== newStatus) {
            onStatusChange(task.id, newStatus);
        }
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-4 md:flex-row">
                {COLUMNS.map((col) => (
                    <Column
                        key={col.status}
                        status={col.status}
                        label={col.label}
                        tasks={tasks.filter((t) => t.status === col.status)}
                        onToggleFavourite={onToggleFavourite}
                        onToggleChecklistItem={onToggleChecklistItem}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        </DndContext>
    );
};

export default TaskBoard;
