import type { ReactNode } from 'react';

import { ETSY_STATUS_LABEL, type EtsyStatus } from '@/lib/etsyStatus';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'accent' | 'warning' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
    neutral: 'border-border bg-card text-foreground',
    accent: 'border-primary bg-primary text-primary-foreground',
    warning: 'border-warning bg-card text-warning',
    danger: 'border-destructive bg-card text-destructive',
};

export function StatusTag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
    return (
        <span
            className={cn(
                'inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium',
                TONE_CLASS[tone]
            )}
        >
            {children}
        </span>
    );
}

export function EtsyStatusTag({ status }: { status: EtsyStatus }) {
    return <StatusTag tone={status === 'listed' ? 'accent' : 'neutral'}>{ETSY_STATUS_LABEL[status]}</StatusTag>;
}
