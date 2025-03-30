import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@jewellery-catalogue/types': path.resolve(__dirname, '../types/src'),
        }
    },
    test: {
        setupFiles: ['./src/setupTests.ts'],
        environment: 'jsdom',
        globals: true,
    },
    build: {
        outDir: './build',
    },
});
