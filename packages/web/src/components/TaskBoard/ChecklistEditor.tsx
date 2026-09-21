import type { TaskChecklistItem } from '@jewellery-catalogue/types';
import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ChecklistEditor: React.FC<{
    idPrefix: string;
    items: Array<TaskChecklistItem>;
    onChange: (items: Array<TaskChecklistItem>) => void;
}> = ({ idPrefix, items, onChange }) => {
    const [draft, setDraft] = useState('');

    const addItem = () => {
        const text = draft.trim();
        if (!text) return;

        onChange([...items, { id: crypto.randomUUID(), text, done: false }]);
        setDraft('');
    };

    const doneCount = items.filter((item) => item.done).length;

    return (
        <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-checklist-item`}>
                Checklist{items.length > 0 && ` (${doneCount}/${items.length})`}
            </Label>

            {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                        id={`${idPrefix}-checklist-${item.id}`}
                        checked={item.done}
                        onCheckedChange={() =>
                            onChange(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
                        }
                        aria-label={item.done ? `Uncheck ${item.text}` : `Check ${item.text}`}
                    />
                    <label
                        htmlFor={`${idPrefix}-checklist-${item.id}`}
                        className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}
                    >
                        {item.text}
                    </label>
                    <button
                        type="button"
                        aria-label={`Remove ${item.text}`}
                        onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}

            <div className="flex items-center gap-2">
                <Input
                    id={`${idPrefix}-checklist-item`}
                    placeholder="Add checklist item"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        // The dialogs submit on Enter otherwise, which would save a half-built checklist.
                        e.preventDefault();
                        addItem();
                    }}
                />
                <Button type="button" variant="outline" onClick={addItem} disabled={!draft.trim()}>
                    Add
                </Button>
            </div>
        </div>
    );
};

export default ChecklistEditor;
