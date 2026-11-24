import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@jewellery-catalogue/types': path.resolve(__dirname, '../types/src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-setup.ts'],
        exclude: ['**/node_modules/**', '**/tests/e2e/**'],
    },
});
