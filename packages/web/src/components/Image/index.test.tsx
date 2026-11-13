import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { Image } from '.';

const mockAuth = vi.hoisted(() => ({ accessToken: 'jwt' as string | null }));

vi.mock('@imapps/web-utils', () => ({ useAuth: () => mockAuth }));

describe('Image', () => {
    afterEach(() => {
        cleanup();
        mockAuth.accessToken = 'jwt';
    });

    it('requests the image with the access token', () => {
        render(<Image imageId="abc" />);

        expect(screen.getByRole('img').getAttribute('src')).toBe('/api/image/abc?token=jwt');
    });

    it('requests the given size', () => {
        render(<Image imageId="abc" size="thumb" />);

        expect(screen.getByRole('img').getAttribute('src')).toBe('/api/image/abc?size=thumb&token=jwt');
    });

    it('does not request an image when imageId is empty', () => {
        const { container } = render(<Image imageId="" />);

        expect(container.querySelector('img')).toBeNull();
        expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    });

    it('shows the placeholder when the image fails to load', () => {
        render(<Image imageId="abc" />);
        fireEvent.error(screen.getByRole('img'));

        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    });
});
