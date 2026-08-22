import {
    type Task,
    type TaskImportance,
    type TaskSubject,
    taskImportanceEnum,
    taskSubjectEnum,
} from '@jewellery-catalogue/types';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const IMPORTANCE_VARIANT: Record<TaskImportance, 'default' | 'secondary' | 'destructive'> = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
};

const TaskFilters: React.FC<{
    tasks: Array<Task>;
    subjectFilter: TaskSubject | 'all';
    importanceFilter: Set<TaskImportance>;
    onSubjectFilterChange: (subject: TaskSubject | 'all') => void;
    onImportanceFilterChange: (importance: TaskImportance) => void;
}> = ({ tasks, subjectFilter, importanceFilter, onSubjectFilterChange, onImportanceFilterChange }) => {
    return (
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <Tabs value={subjectFilter} onValueChange={(v) => onSubjectFilterChange(v as TaskSubject | 'all')}>
                <TabsList>
                    <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
                    {taskSubjectEnum.options.map((subject) => (
                        <TabsTrigger key={subject} value={subject} className="capitalize">
                            {subject} ({tasks.filter((t) => t.subject === subject).length})
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
                {taskImportanceEnum.options.map((importance) => {
                    const active = importanceFilter.has(importance);
                    return (
                        <Badge
                            key={importance}
                            variant={active ? IMPORTANCE_VARIANT[importance] : 'outline'}
                            className="capitalize cursor-pointer select-none"
                            onClick={() => onImportanceFilterChange(importance)}
                        >
                            {importance}
                        </Badge>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskFilters;
