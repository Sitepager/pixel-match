import { parentPort, workerData } from 'worker_threads';
import type { PixelmatchOptions } from './index';
import {
    colorDelta,
    drawPixel,
    drawGrayPixel,
    antialiased,
    findBestMatchingPixel,
} from './core-utils/utils';

// Worker main logic
if (parentPort) {
    const {
        img1,
        img2,
        output,
        width,
        height,
        startY,
        endY,
        options,
    }: {
        img1: Uint8Array | Uint8ClampedArray;
        img2: Uint8Array | Uint8ClampedArray;
        output: SharedArrayBuffer | null;
        width: number;
        height: number;
        startY: number;
        endY: number;
        options: PixelmatchOptions;
    } = workerData;

    const {
        threshold = 0.1,
        alpha = 0.1,
        aaColor = [255, 255, 0],
        diffColor = [255, 0, 0],
        includeAA,
        diffColorAlt,
        diffMask,
        horizontalShiftPixels = 0,
        verticalShiftPixels = 0,
    } = options;

    const maxDelta = 35215 * threshold * threshold;
    const [aaR, aaG, aaB] = aaColor;
    const [diffR, diffG, diffB] = diffColor;
    const [altR, altG, altB] = diffColorAlt || diffColor;
    let diff = 0;

    const a32 = new Uint32Array(img1.buffer, img1.byteOffset, width * height);
    const b32 = new Uint32Array(img2.buffer, img2.byteOffset, width * height);

    // If output is provided, create a Uint8Array view over the SharedArrayBuffer
    let outputView: Uint8Array | null = null;
    if (output) {
        outputView = new Uint8Array(output);
    }

    for (let y = startY; y < endY; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const pos = i * 4;
            let delta =
                a32[i] === b32[i] ? 0 : colorDelta(img1, img2, pos, pos, false);
            if (
                (delta > maxDelta || delta < -1 * maxDelta) &&
                (horizontalShiftPixels > 0 || verticalShiftPixels > 0)
            ) {
                delta = findBestMatchingPixel(
                    img1,
                    img2,
                    x,
                    y,
                    width,
                    height,
                    pos,
                    horizontalShiftPixels,
                    verticalShiftPixels,
                );
            }
            if (Math.abs(delta) > maxDelta) {
                const isAA =
                    antialiased(img1, x, y, width, height, a32, b32) ||
                    antialiased(img2, x, y, width, height, b32, a32);
                if (!includeAA && isAA) {
                    if (outputView && !diffMask) {
                        drawPixel(outputView, pos, aaR, aaG, aaB);
                    }
                } else {
                    if (outputView) {
                        if (delta < 0) {
                            drawPixel(outputView, pos, altR, altG, altB);
                        } else {
                            drawPixel(outputView, pos, diffR, diffG, diffB);
                        }
                    }
                    diff++;
                }
            } else if (outputView && !diffMask) {
                drawGrayPixel(img1, pos, alpha, outputView);
            }
        }
    }
    parentPort.postMessage(diff);
}
