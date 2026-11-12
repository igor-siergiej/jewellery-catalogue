import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ResponsiveDialog } from '.';

const listeners = new Set<() => void>();

const setWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
};

const resize = (width: number) =>
    act(() => {
        setWidth(width);

        for (const listener of listeners) listener();
    });

const Body = () => <input aria-label="Name" />;

describe('ResponsiveDialog', () => {
    beforeEach(() => {
        listeners.clear();
        vi.stubGlobal(
            'matchMedia',
            vi.fn((query: string) => ({
                matches: false,
                media: query,
                addEventListener: (_: string, cb: () => void) => listeners.add(cb),
                removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
                addListener: () => {},
                removeListener: () => {},
                dispatchEvent: () => false,
                onchange: null,
            }))
        );
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('keeps the open variant and its body when the viewport crosses 768px', () => {
        setWidth(1024);
        render(
            <ResponsiveDialog open onOpenChange={() => {}} title="Edit design">
                <Body />
            </ResponsiveDialog>
        );
        const input = screen.getByLabelText('Name') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Typed' } });

        resize(500);

        expect(document.querySelector('[data-vaul-drawer]')).toBeNull();
        expect(screen.getByLabelText('Name')).toBe(input);
        expect(input.value).toBe('Typed');
    });

    it('opens as a drawer on a phone, scrolling only the body', () => {
        setWidth(390);
        render(
            <ResponsiveDialog
                open
                onOpenChange={() => {}}
                title="Edit design"
                footer={<button type="button">Save</button>}
            >
                <Body />
            </ResponsiveDialog>
        );

        const drawer = document.querySelector('[data-vaul-drawer]') as HTMLElement;
        expect(drawer).not.toBeNull();
        expect(drawer.className).toContain('overflow-hidden');
        expect(drawer.className).not.toContain('overflow-y-auto');
    });
});
