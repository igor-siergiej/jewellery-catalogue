import { useLayoutEffect, useRef } from 'react';

/**
 * Radix only refocuses a dialog's trigger when it renders a `Trigger`; ours are opened from state, so
 * pass the returned handler to `onCloseAutoFocus` to return focus to whatever held it when the dialog opened.
 */
export function useRestoreFocus(open: boolean) {
    const openerRef = useRef<HTMLElement | null>(null);

    useLayoutEffect(() => {
        if (open) openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }, [open]);

    return (event: Event) => {
        const opener = openerRef.current;
        openerRef.current = null;
        event.preventDefault();

        if (opener && opener !== document.body && opener.isConnected) opener.focus();
    };
}
