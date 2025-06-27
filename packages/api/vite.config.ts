import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@jewellery-catalogue/types': path.resolve(__dirname, '../types/src')
        }
    }
});
