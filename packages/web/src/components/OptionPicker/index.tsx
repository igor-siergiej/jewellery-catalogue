import { Check } from 'lucide-react';
import { type HTMLAttributes, type KeyboardEvent, useRef } from 'react';

import { cn } from '@/lib/utils';

export interface OptionPickerProps<T extends string> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
    options: ReadonlyArray<{ value: T; label: string }>;
    value: T | undefined;
    /** Clicking the selected option again clears it. */
    onChange: (value: T | undefined) => void;
    disabled?: boolean;
}

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREV_KEYS = ['ArrowLeft', 'ArrowUp'];

export function OptionPicker<T extends string>({
    options,
    value,
    onChange,
    disabled,
    className,
    ...rest
}: OptionPickerProps<T>) {
    const invalid = rest['aria-invalid'] === true || rest['aria-invalid'] === 'true';
    const refs = useRef<Array<HTMLButtonElement | null>>([]);
    const selectedIndex = options.findIndex((o) => o.value === value);
    const tabbableIndex = selectedIndex === -1 ? 0 : selectedIndex;

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const step = NEXT_KEYS.includes(e.key) ? 1 : PREV_KEYS.includes(e.key) ? -1 : 0;

        if (!step) return;

        e.preventDefault();
        const next = (index + step + options.length) % options.length;
        refs.current[next]?.focus();
        onChange(options[next].value);
    };

    return (
        <div {...rest} role="radiogroup" className={cn('flex flex-wrap gap-2', className)}>
            {options.map((option, index) => {
                const selected = option.value === value;

                return (
                    <button
                        key={option.value}
                        ref={(el) => {
                            refs.current[index] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={index === tabbableIndex ? 0 : -1}
                        disabled={disabled}
                        onClick={() => onChange(selected ? undefined : option.value)}
                        onKeyDown={(e) => onKeyDown(e, index)}
                        className={cn(
                            'inline-flex h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors md:h-9',
                            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input bg-card text-foreground hover:bg-accent',
                            invalid && !selected && 'border-destructive'
                        )}
                    >
                        {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
