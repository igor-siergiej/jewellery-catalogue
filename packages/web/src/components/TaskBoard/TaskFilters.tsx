import {
    type Task,
    type TaskImportance,
    type TaskSubject,
    taskImportanceEnum,
    taskSubjectEnum,
} from '@jewellery-catalogue/types';
import { Check } from 'lucide-react';

import {
    FILTER_TAB_PROPS,
    Tabs,
    TabsList,
    TabsTrigger,
    UNDERLINE_TAB_CLASS,
    UNDERLINE_TAB_LIST_CLASS,
} from '@/components/ui/tabs';
import { TASK_IMPORTANCE_LABELS, TASK_SUBJECT_LABELS } from '@/lib/boardLabels';
import { cn } from '@/lib/utils';

const TaskFilters: React.FC<{
    tasks: Array<Task>;
    subjectFilter: TaskSubject | 'all';
    importanceFilter: Set<TaskImportance>;
    onSubjectFilterChange: (subject: TaskSubject | 'all') => void;
    onImportanceFilterChange: (importance: TaskImportance) => void;
}> = ({ tasks, subjectFilter, importanceFilter, onSubjectFilterChange, onImportanceFilterChange }) => {
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <Tabs
                className="min-w-0 max-w-full"
                value={subjectFilter}
                onValueChange={(v) => onSubjectFilterChange(v as TaskSubject | 'all')}
            >
                <TabsList aria-label="Subject" className={UNDERLINE_TAB_LIST_CLASS}>
                    <TabsTrigger value="all" className={UNDERLINE_TAB_CLASS} {...FILTER_TAB_PROPS}>
                        All ({tasks.length})
                    </TabsTrigger>
                    {taskSubjectEnum.options.map((subject) => (
                        <TabsTrigger
                            key={subject}
                            value={subject}
                            className={UNDERLINE_TAB_CLASS}
                            {...FILTER_TAB_PROPS}
                        >
                            {TASK_SUBJECT_LABELS[subject]} ({tasks.filter((t) => t.subject === subject).length})
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div role="group" aria-labelledby="priority-filter-label" className="flex flex-wrap items-center gap-2">
                <span id="priority-filter-label" className="text-sm text-muted-foreground">
                    Priority
                </span>
                {taskImportanceEnum.options.map((importance) => {
                    const active = importanceFilter.has(importance);

                    return (
                        <button
                            key={importance}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onImportanceFilterChange(importance)}
                            className={cn(
                                'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors md:min-h-8',
                                'outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                                active
                                    ? 'border-primary bg-accent text-primary'
                                    : 'border-input bg-card text-foreground hover:bg-accent'
                            )}
                        >
                            {active && <Check className="size-3.5" aria-hidden="true" />}
                            {TASK_IMPORTANCE_LABELS[importance]}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskFilters;
