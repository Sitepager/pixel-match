/**
 * Compare two equally sized images, pixel by pixel.
 *
 * @param img1 First image data.
 * @param img2 Second image data.
 * @param output Image data to write the diff to, if provided.
 * @param width Input images width.
 * @param height Input images height.
 * @param options Options for comparison.
 * @returns The number of mismatched pixels.
 */
export interface PixelmatchOptions {
    threshold?: number;
    includeAA?: boolean;
    alpha?: number;
    aaColor?: [number, number, number];
    diffColor?: [number, number, number];
    diffColorAlt?: [number, number, number];
    diffMask?: boolean;
    horizontalShiftPixels?: number;
    verticalShiftPixels?: number;
}

/**
 * Compares two images pixel by pixel and generates a diff image highlighting the differences.
 * This function is useful for visual regression testing and image comparison.
 *
 * @param img1 - First image data as a Uint8Array or Uint8ClampedArray in RGBA format
 * @param img2 - Second image data as a Uint8Array or Uint8ClampedArray in RGBA format
 * @param output - Optional output image data to write the diff to. If null, only the difference count is returned
 * @param width - Width of the images in pixels
 * @param height - Height of the images in pixels
 * @param options - Configuration options for the comparison
 * @param options.threshold - Color difference threshold (0 to 1). Default: 0.1
 * @param options.alpha - Opacity of unchanged pixels in the diff output. Default: 0.1
 * @param options.aaColor - Color of anti-aliased pixels in the diff output [r, g, b]. Default: [255, 255, 0] (yellow)
 * @param options.diffColor - Color of different pixels in the diff output [r, g, b]. Default: [255, 0, 0] (red)
 * @param options.includeAA - Whether to detect and ignore anti-aliasing. Default: false
 * @param options.diffColorAlt - Alternative color for different pixels when img2 is darker [r, g, b]
 * @param options.diffMask - Whether to draw the diff over a transparent background (true) or over the original image (false)
 * @param options.horizontalShiftPixels - Number of pixels to check horizontally for similar pixels. Default: 0
 * @param options.verticalShiftPixels - Number of pixels to check vertically for similar pixels. Default: 0
 *
 * @returns The number of different pixels found between the images
 *
 * @throws {Error} If image data is not in the correct format (Uint8Array or Uint8ClampedArray)
 * @throws {Error} If image sizes do not match
 * @throws {Error} If image data size does not match width/height
 */
export default function pixelmatch(
    img1: Uint8Array | Uint8ClampedArray,
    img2: Uint8Array | Uint8ClampedArray,
    output: Uint8Array | Uint8ClampedArray | null,
    width: number,
    height: number,
    options: PixelmatchOptions = {},
): number {
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

    if (
        !isPixelData(img1) ||
        !isPixelData(img2) ||
        (output && !isPixelData(output))
    )
        throw new Error(
            'Image data: Uint8Array, Uint8ClampedArray or Buffer expected.',
        );

    if (
        img1.length !== img2.length ||
        (output && output.length !== img1.length)
    )
        throw new Error('Image sizes do not match.');

    if (img1.length !== width * height * 4)
        throw new Error('Image data size does not match width/height.');

    // check if images are identical
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
        // fast path if identical
        if (output && !diffMask) {
            for (let i = 0; i < len; i++)
                drawGrayPixel(img1, 4 * i, alpha, output);
        }
        return 0;
    }

    // maximum acceptable square distance between two colors;
    // 35215 is the maximum possible value for the YIQ difference metric
    const maxDelta = 35215 * threshold * threshold;
    const [aaR, aaG, aaB] = aaColor;
    const [diffR, diffG, diffB] = diffColor;
    const [altR, altG, altB] = diffColorAlt || diffColor;
    let diff = 0;

    // compare each pixel of one image against the other one
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const pos = i * 4;

            // squared YUV distance between colors at this pixel position, negative if the img2 pixel is darker
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

            // the color difference is above the threshold
            if (Math.abs(delta) > maxDelta) {
                // check it's a real rendering difference or just anti-aliasing
                const isAA =
                    antialiased(img1, x, y, width, height, a32, b32) ||
                    antialiased(img2, x, y, width, height, b32, a32);
                if (!includeAA && isAA) {
                    // one of the pixels is anti-aliasing; draw as yellow and do not count as difference
                    // note that we do not include such pixels in a mask
                    if (output && !diffMask)
                        drawPixel(output, pos, aaR, aaG, aaB);
                } else {
                    // found substantial difference not caused by anti-aliasing; draw it as such
                    if (output) {
                        if (delta < 0) {
                            drawPixel(output, pos, altR, altG, altB);
                        } else {
                            drawPixel(output, pos, diffR, diffG, diffB);
                        }
                    }
                    diff++;
                }
            } else if (output && !diffMask) {
                // pixels are similar; draw background as grayscale image blended with white
                drawGrayPixel(img1, pos, alpha, output);
            }
        }
    }

    // return the number of different pixels
    return diff;
}

function isPixelData(arr: any): arr is Uint8Array | Uint8ClampedArray {
    // work around instanceof Uint8Array not working properly in some Jest environments
    return (
        ArrayBuffer.isView(arr) &&
        typeof (arr as any).BYTES_PER_ELEMENT === 'number' &&
        (arr as any).BYTES_PER_ELEMENT === 1
    );
}

/**
 * Determines if a pixel at (x1, y1) is likely to be anti-aliased by examining its neighbors in two images.
 *
 * This helps distinguish real differences from those caused by anti-aliasing artifacts.
 *
 * @param img - The image data array (RGBA, Uint8Array or Uint8ClampedArray).
 * @param x1 - The x-coordinate of the pixel.
 * @param y1 - The y-coordinate of the pixel.
 * @param width - The width of the image in pixels.
 * @param height - The height of the image in pixels.
 * @param a32 - The first image data as a Uint32Array (one value per pixel).
 * @param b32 - The second image data as a Uint32Array (one value per pixel).
 * @returns True if the pixel is likely anti-aliased, false otherwise.
 */
function antialiased(
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

    // go through 8 adjacent pixels
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;

            // brightness delta between the center pixel and adjacent one
            const delta = colorDelta(
                img,
                img,
                pos * 4,
                (y * width + x) * 4,
                true,
            );

            // count the number of equal, darker and brighter adjacent pixels
            if (delta === 0) {
                zeroes++;
                // if found more than 2 equal siblings, it's definitely not anti-aliasing
                if (zeroes > 2) return false;

                // remember the darkest pixel
            } else if (delta < min) {
                min = delta;
                minX = x;
                minY = y;

                // remember the brightest pixel
            } else if (delta > max) {
                max = delta;
                maxX = x;
                maxY = y;
            }
        }
    }

    // if there are no both darker and brighter pixels among siblings, it's not anti-aliasing
    if (min === 0 || max === 0) return false;

    // if either the darkest or the brightest pixel has 3+ equal siblings in both images
    // (definitely not anti-aliased), this pixel is anti-aliased
    return (
        (hasManySiblings(a32, minX, minY, width, height) &&
            hasManySiblings(b32, minX, minY, width, height)) ||
        (hasManySiblings(a32, maxX, maxY, width, height) &&
            hasManySiblings(b32, maxX, maxY, width, height))
    );
}

/**
 * Checks if a pixel at (x1, y1) in the image has more than two adjacent pixels with the same value.
 *
 * Used to help determine if a pixel is anti-aliased by checking for clusters of similar pixels.
 *
 * @param img - The image data as a Uint32Array (one value per pixel).
 * @param x1 - The x-coordinate of the pixel.
 * @param y1 - The y-coordinate of the pixel.
 * @param width - The width of the image in pixels.
 * @param height - The height of the image in pixels.
 * @returns True if the pixel has more than two identical neighbors, false otherwise.
 */
function hasManySiblings(
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

    // go through 8 adjacent pixels
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
 * Computes the color difference between two pixels using a YIQ color space metric.
 *
 * The difference is positive if the second pixel is lighter, negative if darker. Optionally, only the brightness (Y) difference can be returned.
 *
 * @param img1 - The first image data array (RGBA, Uint8Array or Uint8ClampedArray).
 * @param img2 - The second image data array (RGBA, Uint8Array or Uint8ClampedArray).
 * @param k - The starting index of the pixel in img1 (should point to the red channel).
 * @param m - The starting index of the pixel in img2 (should point to the red channel).
 * @param yOnly - If true, only the brightness (Y) difference is returned; otherwise, a full color difference metric is computed.
 * @returns The color difference metric (positive if img2 is lighter, negative if darker).
 */
function colorDelta(
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
        // blend pixels with background
        const rb = 48 + 159 * (k % 2);
        const gb = 48 + 159 * (((k / 1.618033988749895) | 0) % 2);
        const bb = 48 + 159 * (((k / 2.618033988749895) | 0) % 2);
        dr = (r1 * a1 - r2 * a2 - rb * da) / 255;
        dg = (g1 * a1 - g2 * a2 - gb * da) / 255;
        db = (b1 * a1 - b2 * a2 - bb * da) / 255;
    }

    const y = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223;

    if (yOnly) return y; // brightness difference only

    const i = dr * 0.59597799 - dg * 0.2741761 - db * 0.32180189;
    const q = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694;

    const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;

    // encode whether the pixel lightens or darkens in the sign
    return y > 0 ? -delta : delta;
}

/**
 * Writes an RGB pixel with full opacity to the output image data array at the specified position.
 *
 * @param output - The output image data array (RGBA, Uint8Array or Uint8ClampedArray).
 * @param pos - The starting index of the pixel in the output array (should point to the red channel of the pixel).
 * @param r - The red channel value (0-255).
 * @param g - The green channel value (0-255).
 * @param b - The blue channel value (0-255).
 */
function drawPixel(
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
 * Draws a grayscale version of a pixel from the input image onto the output image, blending it with white based on the given alpha value.
 *
 * This function is typically used to render background pixels in image diff outputs, where pixels are considered similar between two images.
 * The grayscale value is computed using the standard luminance formula, then blended with white according to the alpha and the pixel's own alpha channel.
 *
 * @param img - The source image data array (RGBA, Uint8Array or Uint8ClampedArray).
 * @param i - The starting index of the pixel in the image data array (should point to the red channel of the pixel).
 * @param alpha - The blending factor (0 to 1) controlling how much of the grayscale value is blended with white.
 * @param output - The output image data array where the resulting grayscale pixel will be written.
 */
function drawGrayPixel(
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
 * Finds the best matching pixel within a shift range by comparing color differences.
 *
 * @param img1 - First image data
 * @param img2 - Second image data
 * @param x - Current x coordinate
 * @param y - Current y coordinate
 * @param width - Image width
 * @param height - Image height
 * @param pos - Current pixel position in the image data
 * @param horizontalShiftPixels - Maximum horizontal shift to check
 * @param verticalShiftPixels - Maximum vertical shift to check
 * @returns The best matching color delta found
 */
function findBestMatchingPixel(
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
    let minAbsDelta = 9999;
    let minOtherDelta = 9999;

    // Check all positions within the shift range
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
            // Skip positions outside image bounds
            if (isOutOfBounds(x + hShift, y + vShift, width, height)) {
                continue;
            }

            const shiftedPos = pos + (width * vShift + hShift) * 4;

            // Calculate color differences in both directions
            const currDelta = colorDelta(img1, img2, pos, shiftedPos, false);
            const otherDelta = colorDelta(img1, img2, shiftedPos, pos, false);

            // Update minimum differences if better matches found
            if (Math.abs(currDelta) < Math.abs(minAbsDelta)) {
                minAbsDelta = currDelta;
            }
            if (Math.abs(otherDelta) < Math.abs(minOtherDelta)) {
                minOtherDelta = otherDelta;
            }
        }
    }

    // Return the delta with larger absolute value
    return Math.abs(minAbsDelta) > Math.abs(minOtherDelta)
        ? minAbsDelta
        : minOtherDelta;
}

/**
 * Checks if coordinates are outside image bounds
 */
function isOutOfBounds(
    x: number,
    y: number,
    width: number,
    height: number,
): boolean {
    return x < 0 || x >= width || y < 0 || y >= height;
}
