import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@jewellery-catalogue/types';
import { ChevronDown, ChevronsUp, Minus, Pencil, Star } from 'lucide-react';

import { StatusTag } from '@/components/StatusTag';
import { Checkbox } from '@/components/ui/checkbox';
import { TASK_IMPORTANCE_LABELS, TASK_SUBJECT_LABELS } from '@/lib/boardLabels';
import { cn } from '@/lib/utils';

const PRIORITY_MARKER = { low: ChevronDown, medium: Minus, high: ChevronsUp } as const;

const Priority = ({ importance }: { importance: Task['importance'] }) => {
    const Marker = PRIORITY_MARKER[importance];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 text-xs',
                importance === 'high' ? 'font-medium text-destructive' : 'text-muted-foreground'
            )}
        >
            <Marker className="size-3.5" aria-hidden="true" />
            {TASK_IMPORTANCE_LABELS[importance]} priority
        </span>
    );
};

const TaskCard: React.FC<{
    task: Task;
    onToggleFavourite: (taskId: string) => void;
    onToggleChecklistItem: (taskId: string, itemId: string) => void;
    onEdit: (task: Task) => void;
}> = ({ task, onToggleFavourite, onToggleChecklistItem, onEdit }) => {
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
            role="group"
            aria-pressed={undefined}
            aria-label={task.title}
            className="mb-2 cursor-grab rounded-md border bg-card p-3 active:cursor-grabbing"
        >
            <div className="flex items-start justify-between gap-2 mb-1">
                <p className="min-w-0 break-words text-sm font-medium">{task.title}</p>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        aria-label={`Edit task ${task.title}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(task);
                        }}
                        className="-my-1 inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:size-8"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        aria-label={task.favourite ? 'Unfavourite task' : 'Favourite task'}
                        aria-pressed={!!task.favourite}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavourite(task.id);
                        }}
                        className="-my-1 -mr-1 inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:size-8"
                    >
                        <Star className={cn('h-4 w-4', task.favourite && 'fill-foreground text-foreground')} />
                    </button>
                </div>
            </div>
            {task.description && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
            {task.checklist && task.checklist.length > 0 && (
                <div className="mb-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                        Checklist {task.checklist.filter((item) => item.done).length}/{task.checklist.length}
                    </p>
                    {task.checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                            <Checkbox
                                checked={item.done}
                                aria-label={item.done ? `Uncheck ${item.text}` : `Check ${item.text}`}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={() => onToggleChecklistItem(task.id, item.id)}
                            />
                            <span
                                className={`text-xs ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                            >
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <StatusTag>{TASK_SUBJECT_LABELS[task.subject]}</StatusTag>
                <Priority importance={task.importance} />
                {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
