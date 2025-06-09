import { defineConfig } from 'tsup';

export default defineConfig([
    // Browser build
    {
        entry: ['src/browser/index.ts'],
        outDir: 'dist/browser',
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: false,
        target: 'es2020',
    },
    // Node build (main and worker)
    {
        entry: ['src/node/index.ts', 'src/node/worker.ts'],
        outDir: 'dist/node',
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
        clean: false,
        splitting: false,
        target: 'es2020',
    },
    // Main entry point (re-export)
    {
        entry: ['src/index.ts'],
        outDir: 'dist',
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: false,
        splitting: false,
        target: 'es2020',
    },
    // CLI bin build
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
            // js: '#! /usr/bin/env node',
        },
    },
]);
