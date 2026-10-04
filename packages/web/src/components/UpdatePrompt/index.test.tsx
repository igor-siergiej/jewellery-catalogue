import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UpdatePrompt from '.';

const mockContext = vi.hoisted(() => ({
    hasUpdate: false,
    isUpdating: false,
    updateApp: vi.fn(),
    dismissUpdate: vi.fn(),
}));

vi.mock('../../contexts/PWAContext', () => ({ usePWAContext: () => mockContext }));

describe('UpdatePrompt', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders nothing when no update is available', () => {
        mockContext.hasUpdate = false;
        const { container } = render(<UpdatePrompt />);

        expect(container).toBeEmptyDOMElement();
    });

    it('calls updateApp when Update is clicked', () => {
        mockContext.hasUpdate = true;
        render(<UpdatePrompt />);

        fireEvent.click(screen.getByRole('button', { name: 'Update' }));

        expect(mockContext.updateApp).toHaveBeenCalledOnce();
    });

    it('calls dismissUpdate when Later is clicked', () => {
        mockContext.hasUpdate = true;
        render(<UpdatePrompt />);

        fireEvent.click(screen.getByRole('button', { name: 'Later' }));

        expect(mockContext.dismissUpdate).toHaveBeenCalledOnce();
    });
});
