import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch, { PixelmatchOptions } from '../src';

function runAllTests() {
    diffTest(
        '10main',
        '10baseline',
        '10main-diff',
        { horizontalShiftPixels: 0, verticalShiftPixels: 50, threshold: 0.1 },
        70240,
        false,
    );

    diffTest(
        '10main',
        '10baseline',
        '10main-original-diff',
        { horizontalShiftPixels: 0, verticalShiftPixels: 0, threshold: 0.1 },
        1935304,
        false,
    );
}

describe('pixelmatch errors', () => {
    it('throws error if image sizes do not match', () => {
        expect(() =>
            pixelmatch(new Uint8Array(8), new Uint8Array(9), null, 2, 1),
        ).toThrow('Image sizes do not match');
    });

    it('throws error if image sizes do not match width and height', () => {
        expect(() =>
            pixelmatch(new Uint8Array(9), new Uint8Array(9), null, 2, 1),
        ).toThrow('Image data size does not match width/height');
    });

    it('throws error if provided wrong image data format', () => {
        const err =
            'Image data: Uint8Array, Uint8ClampedArray or Buffer expected';
        const arr = new Uint8Array(4 * 20 * 20);
        const bad = new Array(arr.length).fill(0);
        expect(() => pixelmatch(bad as any, arr, null, 20, 20)).toThrow(err);
        expect(() => pixelmatch(arr, bad as any, null, 20, 20)).toThrow(err);
        expect(() => pixelmatch(arr, arr, bad as any, 20, 20)).toThrow(err);
    });
});

// --- run tests on small files ---
runAllTests();

// --- utils ---

function readImage(name: string): PNG {
    return PNG.sync.read(
        fs.readFileSync(new URL(`./fixtures/${name}.png`, import.meta.url)),
    );
}
function writeImage(name: string, image: PNG) {
    fs.writeFileSync(
        new URL(`./fixtures/${name}.png`, import.meta.url),
        PNG.sync.write(image),
    );
    console.log('wrote image', name);
}

function diffTest(
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
