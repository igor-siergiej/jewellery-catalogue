import { ETSY_TAG_MAX_LENGTH, ETSY_TAGS_MAX, normaliseEtsyTag } from '@jewellery-catalogue/types';
import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
    id: string;
    value: string[];
    onChange: (tags: string[]) => void;
    disabled?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({ id, value, onChange, disabled = false }) => {
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    const full = value.length >= ETSY_TAGS_MAX;

    const commit = () => {
        if (!draft.trim()) {
            setError(null);
            return;
        }
        const tag = normaliseEtsyTag(draft);
        if (!tag) {
            setError(`Tags must be 1–${ETSY_TAG_MAX_LENGTH} characters of letters, numbers, spaces, - or '.`);
            return;
        }
        if (!value.includes(tag)) onChange([...value, tag]);
        setDraft('');
        setError(null);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    return (
        <div className="space-y-2">
            {value.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                    {value.map((tag) => (
                        <li key={tag}>
                            <Badge variant="secondary" className="gap-1 pr-1">
                                {tag}
                                <button
                                    type="button"
                                    aria-label={`Remove tag ${tag}`}
                                    disabled={disabled}
                                    className="rounded-sm p-0.5 hover:bg-muted"
                                    onClick={() => onChange(value.filter((t) => t !== tag))}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex items-center gap-2">
                <Input
                    id={id}
                    aria-label="Add tag"
                    placeholder={full ? 'Tag limit reached' : 'Type a tag and press Enter'}
                    value={draft}
                    disabled={full || disabled}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={commit}
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                    {value.length}/{ETSY_TAGS_MAX}
                </span>
            </div>
            {error && (
                <p role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
};

export default TagInput;
