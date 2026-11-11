import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vite-plus/test';

// Each test starts with an empty document so queryByTestId does not find
// leftovers from the previous render.
afterEach(() => {
    cleanup();
});
