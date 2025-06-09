// Utility functions shared between pixelmatch and worker

/**
 * Checks if the given array is a valid pixel data array (Uint8Array or Uint8ClampedArray).
 * @param arr - The array to check
 * @returns True if the array is a valid pixel data array, false otherwise
 */
export function isPixelData(arr: any): arr is Uint8Array | Uint8ClampedArray {
    return (
        ArrayBuffer.isView(arr) &&
        typeof (arr as any).BYTES_PER_ELEMENT === 'number' &&
        (arr as any).BYTES_PER_ELEMENT === 1
    );
}

/**
 * Calculates the color difference between two pixels in the YIQ color space.
 * @param img1 - First image data array
 * @param img2 - Second image data array
 * @param k - Index of the first pixel in img1
 * @param m - Index of the second pixel in img2
 * @param yOnly - If true, only calculates the Y component difference
 * @returns The color difference value. Positive values indicate img1 is brighter, negative values indicate img2 is brighter
 */
export function colorDelta(
    img1: Uint8Array | Uint8ClampedArray,
    img2: Uint8Array | Uint8ClampedArray,
    k: number,
    m: number,
    yOnly: boolean,
): number {
    const r1 = img1[k];
    const g1 = img1[k + 1];
    const b1 = img1[k + 2];
    const a1 = img1[k + 3];
    const r2 = img2[m];
    const g2 = img2[m + 1];
    const b2 = img2[m + 2];
    const a2 = img2[m + 3];
    let dr = r1 - r2;
    let dg = g1 - g2;
    let db = b1 - b2;
    const da = a1 - a2;
    if (!dr && !dg && !db && !da) return 0;
    if (a1 < 255 || a2 < 255) {
        const rb = 48 + 159 * (k % 2);
        const gb = 48 + 159 * (((k / 1.618033988749895) | 0) % 2);
        const bb = 48 + 159 * (((k / 2.618033988749895) | 0) % 2);
        dr = (r1 * a1 - r2 * a2 - rb * da) / 255;
        dg = (g1 * a1 - g2 * a2 - gb * da) / 255;
        db = (b1 * a1 - b2 * a2 - bb * da) / 255;
    }
    const y = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223;
    if (yOnly) return y;
    const i = dr * 0.59597799 - dg * 0.2741761 - db * 0.32180189;
    const q = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694;
    const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
    return y > 0 ? -delta : delta;
}

/**
 * Draws a pixel with the specified RGB color values to the output array.
 * @param output - The output array to draw to
 * @param pos - The position in the output array to draw the pixel
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 */
export function drawPixel(
    output: Uint8Array | Uint8ClampedArray,
    pos: number,
    r: number,
    g: number,
    b: number,
): void {
    output[pos + 0] = r;
    output[pos + 1] = g;
    output[pos + 2] = b;
    output[pos + 3] = 255;
}

/**
 * Draws a grayscale pixel to the output array based on the input image's luminance.
 * @param img - Source image data array
 * @param i - Index of the pixel in the source image
 * @param alpha - Alpha value for the grayscale effect (0-1)
 * @param output - The output array to draw to
 */
export function drawGrayPixel(
    img: Uint8Array | Uint8ClampedArray,
    i: number,
    alpha: number,
    output: Uint8Array | Uint8ClampedArray,
): void {
    const val =
        255 +
        ((img[i] * 0.29889531 +
            img[i + 1] * 0.58662247 +
            img[i + 2] * 0.11448223 -
            255) *
            alpha *
            img[i + 3]) /
            255;
    drawPixel(output, i, val, val, val);
}

/**
 * Checks if a pixel is likely to be part of an antialiased edge.
 * @param img - Image data array
 * @param x1 - X coordinate of the pixel to check
 * @param y1 - Y coordinate of the pixel to check
 * @param width - Width of the image
 * @param height - Height of the image
 * @param a32 - First image data as Uint32Array
 * @param b32 - Second image data as Uint32Array
 * @returns True if the pixel is likely part of an antialiased edge
 */
export function antialiased(
    img: Uint8Array | Uint8ClampedArray,
    x1: number,
    y1: number,
    width: number,
    height: number,
    a32: Uint32Array,
    b32: Uint32Array,
): boolean {
    const x0 = Math.max(x1 - 1, 0);
    const y0 = Math.max(y1 - 1, 0);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    const pos = y1 * width + x1;
    let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
    let min = 0;
    let max = 0;
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;
            const delta = colorDelta(
                img,
                img,
                pos * 4,
                (y * width + x) * 4,
                true,
            );
            if (delta === 0) {
                zeroes++;
                if (zeroes > 2) return false;
            } else if (delta < min) {
                min = delta;
                minX = x;
                minY = y;
            } else if (delta > max) {
                max = delta;
                maxX = x;
                maxY = y;
            }
        }
    }
    if (min === 0 || max === 0) return false;
    return (
        (hasManySiblings(a32, minX, minY, width, height) &&
            hasManySiblings(b32, minX, minY, width, height)) ||
        (hasManySiblings(a32, maxX, maxY, width, height) &&
            hasManySiblings(b32, maxX, maxY, width, height))
    );
}

/**
 * Checks if a pixel has many similar neighboring pixels.
 * @param img - Image data as Uint32Array
 * @param x1 - X coordinate of the pixel to check
 * @param y1 - Y coordinate of the pixel to check
 * @param width - Width of the image
 * @param height - Height of the image
 * @returns True if the pixel has many similar neighbors
 */
export function hasManySiblings(
    img: Uint32Array,
    x1: number,
    y1: number,
    width: number,
    height: number,
): boolean {
    const x0 = Math.max(x1 - 1, 0);
    const y0 = Math.max(y1 - 1, 0);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    const val = img[y1 * width + x1];
    let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;
            zeroes += +(val === img[y * width + x]);
            if (zeroes > 2) return true;
        }
    }
    return false;
}

/**
 * Finds the best matching pixel between two images within a specified shift range.
 * @param img1 - First image data array
 * @param img2 - Second image data array
 * @param x - X coordinate of the pixel to match
 * @param y - Y coordinate of the pixel to match
 * @param width - Width of the images
 * @param height - Height of the images
 * @param pos - Position of the pixel in the first image
 * @param horizontalShiftPixels - Maximum number of pixels to shift horizontally
 * @param verticalShiftPixels - Maximum number of pixels to shift vertically
 * @returns The color difference value of the best matching pixel
 */
export function findBestMatchingPixel(
    img1: Uint8Array | Uint8ClampedArray,
    img2: Uint8Array | Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number,
    pos: number,
    horizontalShiftPixels: number,
    verticalShiftPixels: number,
): number {
    let minAbsDelta = Infinity;
    let minOtherDelta = Infinity;
    for (
        let hShift = -horizontalShiftPixels;
        hShift <= horizontalShiftPixels;
        ++hShift
    ) {
        for (
            let vShift = -verticalShiftPixels;
            vShift <= verticalShiftPixels;
            ++vShift
        ) {
            if (
                x + hShift < 0 ||
                x + hShift >= width ||
                y + vShift < 0 ||
                y + vShift >= height
            ) {
                continue;
            }
            const shiftedPos = pos + (width * vShift + hShift) * 4;
            const currDelta = colorDelta(img1, img2, pos, shiftedPos, false);
            const otherDelta = colorDelta(img1, img2, shiftedPos, pos, false);
            if (Math.abs(currDelta) < Math.abs(minAbsDelta)) {
                minAbsDelta = currDelta;
            }
            if (Math.abs(otherDelta) < Math.abs(minOtherDelta)) {
                minOtherDelta = otherDelta;
            }
        }
    }
    return Math.abs(minAbsDelta) > Math.abs(minOtherDelta)
        ? minAbsDelta
        : minOtherDelta;
}
