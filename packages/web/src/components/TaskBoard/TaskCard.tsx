import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@jewellery-catalogue/types';
import { Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

const IMPORTANCE_VARIANT: Record<Task['importance'], 'default' | 'secondary' | 'destructive'> = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
};

const TaskCard: React.FC<{ task: Task; onToggleFavourite: (taskId: string) => void }> = ({
    task,
    onToggleFavourite,
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="rounded-md border bg-card p-3 mb-2 cursor-grab active:cursor-grabbing"
        >
            <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium">{task.title}</p>
                <button
                    type="button"
                    aria-label={task.favourite ? 'Unfavourite task' : 'Favourite task'}
                    aria-pressed={!!task.favourite}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavourite(task.id);
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                    <Star className={`h-4 w-4 ${task.favourite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">
                    {task.subject}
                </Badge>
                <Badge variant={IMPORTANCE_VARIANT[task.importance]} className="text-xs capitalize">
                    {task.importance}
                </Badge>
                {task.dueDate && (
                    <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString()}</span>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
