import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@jewellery-catalogue/types': path.resolve(__dirname, '../types/src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['@testing-library/jest-dom/vitest'],
    },
});
