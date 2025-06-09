import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { pixelmatch, PixelmatchOptions } from '../dist/browser/index.mjs';
import { pixelmatch as pixelmatchNode } from '../dist/node/index.mjs';

// Cache for storing read images
const imageCache = new Map<string, PNG>();

export function readImage(name: string): PNG {
    if (imageCache.has(name)) {
        return imageCache.get(name)!;
    }
    const image = PNG.sync.read(
        fs.readFileSync(new URL(`./fixtures/${name}.png`, import.meta.url)),
    );
    imageCache.set(name, image);
    return image;
}

export function writeImage(name: string, image: PNG) {
    fs.writeFileSync(
        new URL(`./fixtures/${name}.png`, import.meta.url),
        PNG.sync.write(image),
    );
    console.log('wrote image', name);
}

export interface PixelMatchTestCase {
    name: string;
    img1: string;
    img2: string;
    diffOutput: string;
    options: PixelmatchOptions;
    expectedMismatch: number;
    isLargeFile?: boolean;
}

export const testCases: PixelMatchTestCase[] = [
    {
        name: 'Basic threshold test',
        img1: '1a',
        img2: '1b',
        diffOutput: '1diff',
        options: { threshold: 0.05 },
        expectedMismatch: 143,
    },
    {
        name: 'Default threshold test',
        img1: '1a',
        img2: '1b',
        diffOutput: '1diffdefaultthreshold',
        options: { threshold: undefined },
        expectedMismatch: 106,
    },
    {
        name: 'Diff mask test',
        img1: '1a',
        img2: '1b',
        diffOutput: '1diffmask',
        options: { threshold: 0.05, includeAA: false, diffMask: true },
        expectedMismatch: 143,
    },
    {
        name: 'Empty diff mask',
        img1: '1a',
        img2: '1a',
        diffOutput: '1emptydiffmask',
        options: { threshold: 0, diffMask: true },
        expectedMismatch: 0,
    },
    {
        name: 'Alpha and color options',
        img1: '2a',
        img2: '2b',
        diffOutput: '2diff',
        options: {
            threshold: 0.05,
            alpha: 0.5,
            aaColor: [0, 192, 0],
            diffColor: [255, 0, 255],
        },
        expectedMismatch: 12437,
    },
    {
        name: 'Test 3',
        img1: '3a',
        img2: '3b',
        diffOutput: '3diff',
        options: { threshold: 0.05 },
        expectedMismatch: 212,
    },
    {
        name: 'Test 4',
        img1: '4a',
        img2: '4b',
        diffOutput: '4diff',
        options: { threshold: 0.05 },
        expectedMismatch: 36049,
    },
    {
        name: 'Test 5',
        img1: '5a',
        img2: '5b',
        diffOutput: '5diff',
        options: { threshold: 0.05 },
        expectedMismatch: 6,
    },
    {
        name: 'Test 6',
        img1: '6a',
        img2: '6b',
        diffOutput: '6diff',
        options: { threshold: 0.05 },
        expectedMismatch: 51,
    },
    {
        name: 'Test 6 empty',
        img1: '6a',
        img2: '6a',
        diffOutput: '6empty',
        options: { threshold: 0 },
        expectedMismatch: 0,
    },
    {
        name: 'Diff color alt',
        img1: '7a',
        img2: '7b',
        diffOutput: '7diff',
        options: { diffColorAlt: [0, 255, 0] },
        expectedMismatch: 2448,
    },
    {
        name: 'Test 8',
        img1: '8a',
        img2: '5b',
        diffOutput: '8diff',
        options: { threshold: 0.05 },
        expectedMismatch: 32896,
    },
    {
        name: 'Test 9',
        img1: '9a',
        img2: '9b',
        diffOutput: '9diff',
        options: { threshold: 0.1 },
        expectedMismatch: 2944,
    },
    {
        name: 'Test 9 empty',
        img1: '9a',
        img2: '9b',
        diffOutput: '9empty',
        options: {
            horizontalShiftPixels: 7,
            verticalShiftPixels: 6,
            threshold: 0.1,
        },
        expectedMismatch: 0,
    },
    // Large file tests
    {
        name: 'Large file with shift',
        img1: '10main',
        img2: '10baseline',
        diffOutput: '10main-diff',
        options: {
            horizontalShiftPixels: 0,
            verticalShiftPixels: 50,
            threshold: 0.1,
        },
        expectedMismatch: 70240,
        isLargeFile: true,
    },
    {
        name: 'Large file original',
        img1: '10main',
        img2: '10baseline',
        diffOutput: '10main-original-diff',
        options: {
            horizontalShiftPixels: 0,
            verticalShiftPixels: 0,
            threshold: 0.1,
        },
        expectedMismatch: 1935304,
        isLargeFile: true,
    },
];

export function runTestSuite(
    testCases: PixelMatchTestCase[],
    implementation: 'browser' | 'node',
) {
    describe(`${implementation} implementation tests`, () => {
        testCases.forEach((testCase) => {
            it(
                testCase.name,
                async () => {
                    const img1 = readImage(testCase.img1);
                    const img2 = readImage(testCase.img2);
                    const { width, height } = img1;
                    const diff = new PNG({ width, height });

                    let mismatch: number;
                    let mismatch2: number;
                    if (implementation === 'node') {
                        mismatch = await pixelmatchNode(
                            img1.data,
                            img2.data,
                            diff.data,
                            width,
                            height,
                            testCase.options,
                        );
                        mismatch2 = await pixelmatchNode(
                            img1.data,
                            img2.data,
                            null,
                            width,
                            height,
                            testCase.options,
                        );
                    } else {
                        mismatch = pixelmatch(
                            img1.data,
                            img2.data,
                            diff.data,
                            width,
                            height,
                            testCase.options,
                        );
                        mismatch2 = pixelmatch(
                            img1.data,
                            img2.data,
                            null,
                            width,
                            height,
                            testCase.options,
                        );
                    }

                    if (process.env.UPDATE) {
                        writeImage(testCase.diffOutput, diff);
                    } else {
                        const expectedDiff = readImage(testCase.diffOutput);
                        expect(
                            Buffer.from(diff.data).equals(
                                Buffer.from(expectedDiff.data),
                            ),
                        ).toBe(true);
                    }
                    expect(mismatch).toBe(testCase.expectedMismatch);
                    expect(mismatch).toBe(mismatch2);
                },
                60_000,
            );
        });
    });
}
