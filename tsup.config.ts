import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: false,
        target: 'es2020',
    },
    {
        entry: ['bin/pixelmatch.ts'],
        format: ['cjs'],
        dts: false,
        outDir: 'dist/bin',
        clean: false,
        splitting: false,
        target: 'es2020',
        sourcemap: false,
        skipNodeModulesBundle: true,
        banner: {
            js: '#! /usr/bin/env node',
        },
    },
]);
