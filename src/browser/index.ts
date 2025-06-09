import {
    isPixelData,
    colorDelta,
    drawPixel,
    drawGrayPixel,
    antialiased,
    findBestMatchingPixel,
} from '../core-utils/utils';

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

export function pixelmatch(
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
