import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { pixelmatch, PixelmatchOptions } from '../src/index.js';
import { pixelmatch as pixelmatchParallel } from '../dist/node/index.mjs';

export function readImage(name: string): PNG {
    return PNG.sync.read(
        fs.readFileSync(new URL(`./fixtures/${name}.png`, import.meta.url)),
    );
}
export function writeImage(name: string, image: PNG) {
    fs.writeFileSync(
        new URL(`./fixtures/${name}.png`, import.meta.url),
        PNG.sync.write(image),
    );
    console.log('wrote image', name);
}

export function diffTest(
    imgPath1: string,
    imgPath2: string,
    diffPath: string,
    options: PixelmatchOptions,
    expectedMismatch: number,
    write: boolean = false,
) {
    describe(`comparing ${imgPath1} to ${imgPath2}, ${JSON.stringify(options)}`, () => {
        it('matches expected diff and mismatch count', () => {
            const img1 = readImage(imgPath1);
            const img2 = readImage(imgPath2);
            const { width, height } = img1;
            const diff = new PNG({ width, height });

            const mismatch = pixelmatch(
                img1.data,
                img2.data,
                diff.data,
                width,
                height,
                options,
            );
            const mismatch2 = pixelmatch(
                img1.data,
                img2.data,
                null,
                width,
                height,
                options,
            );

            if (process.env.UPDATE || write) {
                writeImage(diffPath, diff);
            } else {
                const expectedDiff = readImage(diffPath);
                expect(
                    Buffer.from(diff.data).equals(
                        Buffer.from(expectedDiff.data),
                    ),
                ).toBe(true);
            }
            expect(mismatch).toBe(expectedMismatch);
            expect(mismatch).toBe(mismatch2);
        });
    }, 600000);
}

export function diffTestAsync(
    imgPath1: string,
    imgPath2: string,
    diffPath: string,
    options: PixelmatchOptions,
    expectedMismatch: number,
    write: boolean = false,
) {
    describe(`comparing ${imgPath1} to ${imgPath2}, ${JSON.stringify(options)}`, () => {
        it('matches expected diff and mismatch count', async () => {
            const img1 = readImage(imgPath1);
            const img2 = readImage(imgPath2);
            const { width, height } = img1;
            const diff = new PNG({ width, height });

            const mismatch = await pixelmatchParallel(
                img1.data,
                img2.data,
                diff.data,
                width,
                height,
                options,
            );
            const mismatch2 = await pixelmatchParallel(
                img1.data,
                img2.data,
                null,
                width,
                height,
                options,
            );

            if (process.env.UPDATE || write) {
                writeImage(diffPath, diff);
            } else {
                const expectedDiff = readImage(diffPath);
                expect(
                    Buffer.from(diff.data).equals(
                        Buffer.from(expectedDiff.data),
                    ),
                ).toBe(true);
            }
            expect(mismatch).toBe(expectedMismatch);
            expect(mismatch).toBe(mismatch2);
        });
    }, 600000);
}
