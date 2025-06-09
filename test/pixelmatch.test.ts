import { describe, it, expect } from 'vitest';
import { pixelmatch } from '../src/index.js';
import { runTestSuite, testCases } from './test-utils.js';

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

runTestSuite(testCases, 'browser');
runTestSuite(testCases, 'node');
