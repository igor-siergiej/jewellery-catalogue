import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            '@jewellery-catalogue/types': path.resolve(__dirname, '../types/src'),
        },
    },
});
