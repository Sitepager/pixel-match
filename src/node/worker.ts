// This worker processes a chunk of an image comparison task using pixel matching logic.
// It receives image data and options, compares pixels, and writes the diff result to a shared buffer.
import { parentPort, workerData } from 'worker_threads';
import type { PixelmatchOptions } from '../browser';
import {
    colorDelta, // Calculates color difference between two pixels
    drawPixel, // Draws a colored pixel in the output buffer
    drawGrayPixel, // Draws a grayscale pixel in the output buffer
    antialiased, // Checks if a pixel is antialiased
    findBestMatchingPixel, // Finds the best matching pixel within a shift window
} from '../core-utils/utils';

if (parentPort) {
    // Destructure the data sent to the worker
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
        img1: Uint8Array | Uint8ClampedArray; // First image data
        img2: Uint8Array | Uint8ClampedArray; // Second image data
        output: SharedArrayBuffer | null; // Output buffer for diff image
        width: number; // Image width
        height: number; // Image height
        startY: number; // Start row for this worker
        endY: number; // End row for this worker
        options: PixelmatchOptions; // Comparison options
    } = workerData;

    // Extract options with defaults
    const {
        threshold = 0.1, // Sensitivity threshold for pixel difference
        alpha = 0.1, // Alpha for unchanged pixels in diff
        aaColor = [255, 255, 0], // Color for antialiased pixels
        diffColor = [255, 0, 0], // Color for different pixels
        includeAA, // Whether to include antialiased pixels in diff count
        diffColorAlt, // Alternate color for negative delta
        diffMask, // Whether to output a mask instead of a diff image
        horizontalShiftPixels = 0, // Horizontal shift window for matching
        verticalShiftPixels = 0, // Vertical shift window for matching
    } = options;

    // Calculate the maximum allowed color delta for a pixel to be considered the same
    const maxDelta = 35215 * threshold * threshold;
    const [aaR, aaG, aaB] = aaColor;
    const [diffR, diffG, diffB] = diffColor;
    const [altR, altG, altB] = diffColorAlt || diffColor;
    let diff = 0; // Counter for number of different pixels

    // Create 32-bit views for fast pixel comparison
    const a32 = new Uint32Array(img1.buffer, img1.byteOffset, width * height);
    const b32 = new Uint32Array(img2.buffer, img2.byteOffset, width * height);

    // If output is provided, create a Uint8Array view over the SharedArrayBuffer
    let outputView: Uint8Array | null = null;
    if (output) {
        outputView = new Uint8Array(output);
    }

    // Main loop: iterate over the assigned rows and columns
    for (let y = startY; y < endY; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x; // Pixel index
            const pos = i * 4; // Byte position in RGBA array
            // Fast path: if pixels are identical, delta is 0
            let delta =
                a32[i] === b32[i] ? 0 : colorDelta(img1, img2, pos, pos, false);
            // If pixels are different and shifting is allowed, try to find a better match nearby
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
            // If the color difference exceeds the threshold, mark as different
            if (Math.abs(delta) > maxDelta) {
                // Check if the pixel is antialiased in either image
                const isAA =
                    antialiased(img1, x, y, width, height, a32, b32) ||
                    antialiased(img2, x, y, width, height, b32, a32);
                if (!includeAA && isAA) {
                    // If not including AA pixels, color them with aaColor
                    if (outputView && !diffMask) {
                        drawPixel(outputView, pos, aaR, aaG, aaB);
                    }
                } else {
                    // Otherwise, color the diff pixel (use alt color for negative delta)
                    if (outputView) {
                        if (delta < 0) {
                            drawPixel(outputView, pos, altR, altG, altB);
                        } else {
                            drawPixel(outputView, pos, diffR, diffG, diffB);
                        }
                    }
                    diff++; // Increment diff count
                }
            } else if (outputView && !diffMask) {
                // If pixels are similar, draw a faded grayscale pixel
                drawGrayPixel(img1, pos, alpha, outputView);
            }
        }
    }
    // Send the number of different pixels back to the parent thread
    parentPort.postMessage(diff);
}
