import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UpdatePrompt from '.';

const mockContext = vi.hoisted(() => ({
    hasUpdate: false,
    isUpdating: false,
    isChecking: false,
    updateApp: vi.fn(),
    dismissUpdate: vi.fn(),
    checkForUpdate: vi.fn(),
}));

vi.mock('../../contexts/PWAContext', () => ({ usePWAContext: () => mockContext }));

describe('UpdatePrompt', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockContext.isUpdating = false;
    });

    it('renders nothing when no update is available', () => {
        mockContext.hasUpdate = false;
        render(<UpdatePrompt />);

        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('calls updateApp when Update now is clicked', () => {
        mockContext.hasUpdate = true;
        render(<UpdatePrompt />);

        fireEvent.click(screen.getByRole('button', { name: 'Update now' }));

        expect(mockContext.updateApp).toHaveBeenCalled();
    });

    it('calls dismissUpdate when Later is clicked', () => {
        mockContext.hasUpdate = true;
        render(<UpdatePrompt />);

        fireEvent.click(screen.getByRole('button', { name: 'Later' }));

        expect(mockContext.dismissUpdate).toHaveBeenCalled();
    });

    it('disables buttons while updating', () => {
        mockContext.hasUpdate = true;
        mockContext.isUpdating = true;
        render(<UpdatePrompt />);

        expect(screen.getByRole('button', { name: 'Updating…' }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByRole('button', { name: 'Later' }).hasAttribute('disabled')).toBe(true);
    });
});
