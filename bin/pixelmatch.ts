import { PNG } from 'pngjs';
import fs from 'node:fs';
import { pixelmatch, PixelmatchOptions } from '../src/index.js';

if (process.argv.length < 4) {
    console.log(
        'Usage: pixelmatch image1.png image2.png [diff.png] [threshold] [includeAA] [horizontalShiftPixels] [verticalShiftPixels]',
    );
    process.exit(64);
}

const [
    ,
    ,
    img1Path,
    img2Path,
    diffPath,
    threshold,
    includeAA,
    horizontalShiftPixels,
    verticalShiftPixels,
] = process.argv;
const options: PixelmatchOptions = {};
if (threshold !== undefined) options.threshold = +threshold;
if (includeAA !== undefined) options.includeAA = includeAA !== 'false';
if (horizontalShiftPixels !== undefined)
    options.horizontalShiftPixels = +horizontalShiftPixels;
if (verticalShiftPixels !== undefined)
    options.verticalShiftPixels = +verticalShiftPixels;

const img1 = PNG.sync.read(fs.readFileSync(img1Path));
const img2 = PNG.sync.read(fs.readFileSync(img2Path));

const { width, height } = img1;

if (img2.width !== width || img2.height !== height) {
    console.log(
        `Image dimensions do not match: ${width}x${height} vs ${img2.width}x${img2.height}`,
    );
    process.exit(65);
}

const diff = diffPath ? new PNG({ width, height }) : null;

console.time('matched in');
const diffs = pixelmatch(
    img1.data,
    img2.data,
    diff ? diff.data : null,
    width,
    height,
    options,
);
console.timeEnd('matched in');

console.log(`different pixels: ${diffs}`);
console.log(
    `error: ${Math.round((100 * 100 * diffs) / (width * height)) / 100}%`,
);

if (diff && diffPath) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
}
process.exit(diffs ? 66 : 0);
