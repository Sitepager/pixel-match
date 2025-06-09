import { describe, it, expect } from 'vitest';
import { pixelmatch, PixelmatchOptions } from '../src/index.js';
import { diffTest } from './test-utils';

const options: PixelmatchOptions = { threshold: 0.05 };

function runAllTests() {
    diffTest('1a', '1b', '1diff', options, 143);
    diffTest(
        '1a',
        '1b',
        '1diffdefaultthreshold',
        { threshold: undefined },
        106,
    );
    diffTest(
        '1a',
        '1b',
        '1diffmask',
        { threshold: 0.05, includeAA: false, diffMask: true },
        143,
    );
    diffTest('1a', '1a', '1emptydiffmask', { threshold: 0, diffMask: true }, 0);
    diffTest(
        '2a',
        '2b',
        '2diff',
        {
            threshold: 0.05,
            alpha: 0.5,
            aaColor: [0, 192, 0],
            diffColor: [255, 0, 255],
        },
        12437,
    );
    diffTest('3a', '3b', '3diff', options, 212);
    diffTest('4a', '4b', '4diff', options, 36049);
    diffTest('5a', '5b', '5diff', options, 6);
    diffTest('6a', '6b', '6diff', options, 51);
    diffTest('6a', '6a', '6empty', { threshold: 0 }, 0);
    diffTest('7a', '7b', '7diff', { diffColorAlt: [0, 255, 0] }, 2448);
    diffTest('8a', '5b', '8diff', options, 32896);
    diffTest('9a', '9b', '9diff', { threshold: 0.1 }, 2944);
    diffTest(
        '9a',
        '9b',
        '9empty',
        { horizontalShiftPixels: 7, verticalShiftPixels: 6, threshold: 0.1 },
        0,
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
