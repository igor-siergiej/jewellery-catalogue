import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: 'build',
    target: 'node20',
    format: ['cjs'],
    splitting: false,
    shims: false,
    sourcemap: true,
    clean: true,
    dts: false
});
