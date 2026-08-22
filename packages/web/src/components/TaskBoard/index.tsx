import { DndContext, type DragEndEvent, useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '@jewellery-catalogue/types';

import TaskCard from './TaskCard';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
    { status: 'todo', label: 'To Do' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'done', label: 'Done' },
];

const Column: React.FC<{ status: TaskStatus; label: string; tasks: Array<Task> }> = ({ status, label, tasks }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-[240px] rounded-md border bg-muted/30 p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{tasks.length}</span>
            </div>
            {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
            ))}
        </div>
    );
};

const TaskBoard: React.FC<{ tasks: Array<Task>; onStatusChange: (taskId: string, status: TaskStatus) => void }> = ({
    tasks,
    onStatusChange,
}) => {
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
            <div className="flex gap-4">
                {COLUMNS.map((col) => (
                    <Column
                        key={col.status}
                        status={col.status}
                        label={col.label}
                        tasks={tasks.filter((t) => t.status === col.status)}
                    />
                ))}
            </div>
        </DndContext>
    );
};

export default TaskBoard;
