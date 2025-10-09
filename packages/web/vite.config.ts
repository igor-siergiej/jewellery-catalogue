import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@jewellery-catalogue/types': path.resolve(__dirname, '../types/src'),
            },
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
                },
                '/login': {
                    target: 'http://localhost:3008',
                    changeOrigin: true,
                    secure: false,
                },
                '/register': {
                    target: 'http://localhost:3008',
                    changeOrigin: true,
                    secure: false,
                },
                '/refresh': {
                    target: 'http://localhost:3008',
                    changeOrigin: true,
                    secure: false,
                },
                '/logout': {
                    target: 'http://localhost:3008',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
});
