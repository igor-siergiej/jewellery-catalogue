import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

    it('does not request an image when imageId is empty', () => {
        const { container } = render(<Image imageId="" />);

        expect(container.querySelector('img')).toBeNull();
    });
});
