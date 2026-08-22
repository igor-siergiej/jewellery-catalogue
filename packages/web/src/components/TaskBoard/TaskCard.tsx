import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@jewellery-catalogue/types';

import { Badge } from '@/components/ui/badge';

const IMPORTANCE_VARIANT: Record<Task['importance'], 'default' | 'secondary' | 'destructive'> = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
};

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
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
            <p className="text-sm font-medium mb-1">{task.title}</p>
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
