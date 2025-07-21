import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

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
