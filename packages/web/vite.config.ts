import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
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
        define: {
            __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || (isDev ? 'localhost' : '')),
            __IS_PROD__: JSON.stringify(!isDev),
        },
        build: {
            outDir: './build',
        },
        server: {
            port: 3000,
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: false,
                    secure: false,
                }
            },
        },
    };
});
