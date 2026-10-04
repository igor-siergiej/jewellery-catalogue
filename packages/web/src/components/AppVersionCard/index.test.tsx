import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AppVersionCard from '.';

const mockContext = vi.hoisted(() => ({
    hasUpdate: false,
    isUpdating: false,
    isChecking: false,
    updateApp: vi.fn(),
    dismissUpdate: vi.fn(),
    checkForUpdate: vi.fn(),
}));

vi.mock('../../contexts/PWAContext', () => ({ usePWAContext: () => mockContext }));

describe('AppVersionCard', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        Object.assign(mockContext, { hasUpdate: false, isUpdating: false, isChecking: false });
    });

    it.each([
        ['latest', "You're on the latest version."],
        ['available', 'A new version is available.'],
        ['error', 'Could not check for updates. Try again when online.'],
    ])('shows message for %s check result', async (result, message) => {
        mockContext.checkForUpdate.mockResolvedValue(result);
        render(<AppVersionCard />);

        fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }));

        expect(await screen.findByText(message)).toBeTruthy();
    });

    it('shows Update now and calls updateApp when an update exists', () => {
        mockContext.hasUpdate = true;
        render(<AppVersionCard />);

        fireEvent.click(screen.getByRole('button', { name: 'Update now' }));

        expect(mockContext.updateApp).toHaveBeenCalled();
    });

    it('hides Update now when no update exists', () => {
        render(<AppVersionCard />);

        expect(screen.queryByRole('button', { name: 'Update now' })).toBeNull();
    });

    it('disables check button while checking', () => {
        mockContext.isChecking = true;
        render(<AppVersionCard />);

        expect(screen.getByRole('button', { name: 'Check for updates' }).hasAttribute('disabled')).toBe(true);
    });
});
