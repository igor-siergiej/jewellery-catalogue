import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import ErrorPage from '.';

describe('ErrorPage', () => {
    afterEach(cleanup);

    it('explains what happened and links home', () => {
        render(<ErrorPage error={new Error('Boom')} />);

        expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy();
        expect(screen.getByText('Boom')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Back to home' }).getAttribute('href')).toBe('/');
    });

    it('uses no em dashes or exclamation marks', () => {
        const { container } = render(<ErrorPage error={null} />);

        expect(container.textContent).not.toMatch(/[—!]/);
    });
});
