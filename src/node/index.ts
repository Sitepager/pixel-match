import {
    pixelmatch as _pixelmatch_browser,
    PixelmatchOptions,
} from '../browser';
import { isPixelData, drawGrayPixel } from '../core-utils/utils';
import { Worker } from 'worker_threads';
import { cpus } from 'os';
import path from 'path';

export { PixelmatchOptions };

export async function pixelmatch(
    img1: Uint8Array | Uint8ClampedArray,
    img2: Uint8Array | Uint8ClampedArray,
    output: Uint8Array | Uint8ClampedArray | null,
    width: number,
    height: number,
    options: PixelmatchOptions = {},
): Promise<number> {
    if (!isPixelData(img1) || !isPixelData(img2)) {
        throw new Error(
            'Image data: Uint8Array, Uint8ClampedArray or Buffer expected.',
        );
    }

    if (output && !isPixelData(output)) {
        throw new Error(
            'Image data: Uint8Array, Uint8ClampedArray or Buffer expected. (Output)',
        );
    }
    if (
        img1.length !== img2.length ||
        (output && output.length !== img1.length)
    ) {
        throw new Error('Image sizes do not match.');
    }
    if (img1.length !== width * height * 4) {
        throw new Error('Image data size does not match width/height.');
    }

    // console.log('width * height', width * height);

    const isLargeImage = width * height > 1000000;
    const hasShift =
        options.horizontalShiftPixels || options.verticalShiftPixels;
    let useWorkers = false;

    if (isLargeImage) {
        useWorkers = true;
    }

    if (!isLargeImage && hasShift) {
        useWorkers = true;
    }

    if (!useWorkers) {
        // console.log('running browser version');
        return Promise.resolve(
            _pixelmatch_browser(img1, img2, output, width, height, options),
        );
    }
    // console.log('running node version');
    return await _pixelmatch_node_workers(
        img1,
        img2,
        output,
        width,
        height,
        options,
    );
}

async function _pixelmatch_node_workers(
    img1: Uint8Array | Uint8ClampedArray,
    img2: Uint8Array | Uint8ClampedArray,
    output: Uint8Array | Uint8ClampedArray | null,
    width: number,
    height: number,
    options: PixelmatchOptions = {},
): Promise<number> {
    // Check if images are identical (fast path)
    const len = width * height;
    const a32 = new Uint32Array(img1.buffer, img1.byteOffset, len);
    const b32 = new Uint32Array(img2.buffer, img2.byteOffset, len);
    let identical = true;
    for (let i = 0; i < len; i++) {
        if (a32[i] !== b32[i]) {
            identical = false;
            break;
        }
    }
    if (identical) {
        if (output && !options.diffMask) {
            for (let i = 0; i < len; i++) {
                drawGrayPixel(img1, 4 * i, options.alpha || 0.1, output);
            }
        }
        return 0;
    }

    // Determine number of workers (use number of CPU cores - 1)
    const numWorkers = Math.max(1, cpus().length - 1);
    const chunkHeight = Math.ceil(height / numWorkers);
    const workers: Worker[] = [];
    const workerPromises: Promise<number>[] = [];

    // Path to the worker file (assume src/node/worker.js after build)
    const workerPath = path.join(__dirname, 'worker.js');

    // If output is provided, create a SharedArrayBuffer for it
    let sharedOutputBuffer: SharedArrayBuffer | null = null;
    if (output) {
        sharedOutputBuffer = new SharedArrayBuffer(output.length);
    }

    for (let i = 0; i < numWorkers; i++) {
        const startY = i * chunkHeight;
        const endY = Math.min((i + 1) * chunkHeight, height);
        const worker = new Worker(workerPath, {
            workerData: {
                img1,
                img2,
                output: sharedOutputBuffer, // pass SharedArrayBuffer or null
                width,
                height,
                startY,
                endY,
                options,
            },
        });
        workers.push(worker);
        const workerPromise = new Promise<number>((resolve) => {
            worker.on('message', (diff) => {
                resolve(diff);
            });
            worker.on('error', (err) => {
                console.error('Worker error:', err);
                resolve(0);
            });
        });
        workerPromises.push(workerPromise);
    }
    const results = await Promise.all(workerPromises);
    workers.forEach((worker) => worker.terminate());

    // If output is provided, copy the SharedArrayBuffer back to the output buffer
    if (output && sharedOutputBuffer) {
        const sharedView = new Uint8Array(sharedOutputBuffer);
        output.set(sharedView);
    }
    return results.reduce((sum, diff) => sum + diff, 0);
}
