import { useRef } from 'react';

/**
 * Runs a menu item's action once the menu has fully closed. A dialog opened straight from `onSelect` mounts while
 * the modal menu still holds `pointer-events: none` on the body, records that as the original value and restores
 * it on close, leaving the page unclickable. Spread the result onto `DropdownMenuContent` and pass each item's
 * action to `run` from its `onSelect`.
 */
export function useMenuAction() {
    const pending = useRef<(() => void) | null>(null);

    return {
        run: (action: () => void) => {
            pending.current = action;
        },
        onCloseAutoFocus: () => {
            const action = pending.current;
            pending.current = null;
            action?.();
        },
    };
}
