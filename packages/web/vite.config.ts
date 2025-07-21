import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/// <reference types="vitest" />

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@jewellery-catalogue/types': path.resolve(__dirname, '../types/src'),
        }
    },
    // @ts-expect-error - Vitest config in Vite config
    test: {
        setupFiles: ['./src/setupTests.ts'],
        environment: 'jsdom',
        globals: true,
        exclude: ['tests/**/*', 'node_modules/**/*'],
        include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    },
    build: {
        outDir: './build',
    },
});
