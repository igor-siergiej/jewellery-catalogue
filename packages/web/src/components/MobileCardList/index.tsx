import { ArrowDown, ArrowUp } from 'lucide-react';
import type React from 'react';

import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export const MobileCardList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isMobile = useIsMobile();

    if (!isMobile) return null;

    return (
        <div className="flex flex-col gap-3" data-testid="mobile-card-list">
            {children}
        </div>
    );
};

export const DesktopOnly: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
    const isMobile = useIsMobile();

    if (isMobile) return null;

    return <div className={className}>{children}</div>;
};

export interface MobileCardFact {
    label: string;
    value: React.ReactNode;
}

interface MobileCardProps {
    title: React.ReactNode;
    badges?: React.ReactNode;
    media?: React.ReactNode;
    facts?: Array<MobileCardFact>;
    actions?: React.ReactNode;
}

export const MobileCard: React.FC<MobileCardProps> = ({ title, badges, media, facts, actions }) => (
    <div className="rounded-md border bg-card p-3 space-y-3">
        <div className="flex items-start gap-3">
            {media}
            <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium break-words">{title}</p>
                {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
            </div>
        </div>
        {facts && facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {facts.map(({ label, value }) => (
                    <div key={label} className="min-w-0">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="break-words">{value}</dd>
                    </div>
                ))}
            </dl>
        )}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
);

interface MobileSortSelectProps {
    options: Array<{ field: string; label: string }>;
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string) => void;
}

export const MobileSortSelect: React.FC<MobileSortSelectProps> = ({ options, sortField, sortDirection, onSort }) => {
    const isMobile = useIsMobile();

    if (!onSort || !isMobile) return null;

    return (
        <div className="flex items-center gap-2 mb-3">
            <select
                aria-label="Sort by"
                value={sortField ?? ''}
                onChange={(e) => e.target.value && e.target.value !== sortField && onSort(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
            >
                <option value="">Sort by…</option>
                {options.map(({ field, label }) => (
                    <option key={field} value={field}>
                        {label}
                    </option>
                ))}
            </select>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={!sortField}
                onClick={() => sortField && onSort(sortField)}
                aria-label={sortDirection === 'desc' ? 'Sort descending' : 'Sort ascending'}
            >
                {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
        </div>
    );
};
