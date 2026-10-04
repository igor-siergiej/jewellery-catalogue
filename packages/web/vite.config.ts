import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    // Dev server pins the version so release bumps do not drift e2e visual baselines.
    const appVersion = process.env.APP_VERSION || (isDev ? 'localhost' : packageJson.version) || '';

    return {
        plugins: [
            react(),
            VitePWA({
                strategies: 'injectManifest',
                srcDir: 'src',
                filename: 'sw.ts',
                registerType: 'prompt',
                injectRegister: false,
                injectManifest: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webmanifest}'],
                },
                manifest: {
                    name: 'Jewellery Catalogue',
                    short_name: 'Jewellery',
                    description: 'Catalogue of jewellery designs, materials and Etsy listings',
                    start_url: '/',
                    scope: '/',
                    display: 'standalone',
                    background_color: '#CCDAF4',
                    theme_color: '#CCDAF4',
                    icons: [
                        { src: 'logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                        { src: 'logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                        { src: 'logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                    ],
                },
                devOptions: { enabled: false },
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@jewellery-catalogue/types': path.resolve(__dirname, '../types/src'),
            },
        },
        define: {
            __APP_VERSION__: JSON.stringify(appVersion),
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
                    bypass: (req) => (req.method === 'GET' ? '/' : null),
                },
                '/register': {
                    target: 'http://localhost:3008',
                    changeOrigin: true,
                    secure: false,
                    bypass: (req) => (req.method === 'GET' ? '/' : null),
                },
                '/refresh': {
                    target: 'http://localhost:3008',
                    changeOrigin: true,
                    secure: false,
                    bypass: (req) => (req.method === 'GET' ? '/' : null),
                },
                '/logout': {
                    target: 'http://localhost:3008',
                    changeOrigin: true,
                    secure: false,
                    bypass: (req) => (req.method === 'GET' ? '/' : null),
                },
            },
        },
    };
});
