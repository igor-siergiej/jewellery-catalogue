import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type StateViewProps =
    | { kind: 'loading'; what: string }
    | { kind: 'error'; what: string; onRetry?: () => void }
    | { kind: 'empty'; title: string; body: string; action?: ReactNode };

export function StateView(props: StateViewProps) {
    const wrapper = 'flex flex-col items-center justify-center gap-2 px-4 py-12 text-center';

    if (props.kind === 'loading') {
        return (
            <div role="status" className={wrapper}>
                <p className="text-sm text-muted-foreground">Loading {props.what}</p>
            </div>
        );
    }

    if (props.kind === 'error') {
        return (
            <div role="alert" className={wrapper}>
                <p className="font-medium">Couldn't load {props.what}</p>
                {props.onRetry && (
                    <Button variant="outline" size="sm" onClick={props.onRetry}>
                        Try again
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={wrapper}>
            <h2 className="text-base font-semibold">{props.title}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{props.body}</p>
            {props.action && <div className="mt-2">{props.action}</div>}
        </div>
    );
}
